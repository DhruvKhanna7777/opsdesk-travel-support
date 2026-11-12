import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import dotenv from "dotenv";
import pg from "pg";

const env = dotenv.parse(
  readFileSync(new URL("../backend/.env", import.meta.url)),
);
const base = process.env.OPSDESK_TEST_URL || "http://127.0.0.1:3001";
assert.equal(env.OPSDESK_DEMO, "true");
for (const url of [env.DATABASE_URL, base])
  assert(["127.0.0.1", "localhost"].includes(new URL(url).hostname));
const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
  options: "-c timezone=UTC",
});
const id = `tbo-${randomUUID()}`;
let checks = 0;

async function call(path, token, status = 200, body) {
  const response = await fetch(base + path, {
    method: body ? "POST" : "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  assert.equal(response.status, status, path);
  checks++;
  return response.headers.get("content-type")?.startsWith("text/csv")
    ? response.text()
    : response.json();
}
async function login(account) {
  const { accessToken } = await call("/auth/login", null, 200, {
    email: `${account}@opsdesk.demo`,
    password: "OpsDeskDemo!2026",
  });
  assert(accessToken);
  return accessToken;
}

try {
  const inserted = await pool.query(
    `INSERT INTO "TravelTicket" (id,reference,title,description,"agencyId","customerId","bookingId","agentId",
      category,status,priority,region,deadline,"responseDeadline","updatedAt")
      SELECT $1,$1,'Synthetic escalation','Synthetic escalation reason fixture',"agencyId","customerId",id,
        'agent-asia','REFUND','OPEN','LOW',region,NOW()+interval '2 days',NOW()+interval '3 days',NOW()
      FROM "TravelBooking" WHERE id='booking-0'`,
    [id],
  );
  assert.equal(inserted.rowCount, 1);
  const manager = await login("manager"),
    agent = await login("asia"),
    foreignAgent = await login("europe"),
    agency = await login("agency"),
    otherAgency = await login("horizon"),
    supplier = await login("supplier");
  const detail = `/ops/tickets/${id}`;
  const escalate = `${detail}/escalate-to-em`;
  const filters = `search=${id}&intent=REFUND`;
  const queue = `/ops/queue?${filters}`;
  const emQueue = `${queue}&attention=1&em=1`;
  const exportPath = `/ops/queue/export?${filters}`;
  const before = await call(detail, agent);
  assert.equal(before.priority, "LOW");
  assert.equal((await call(queue, agency)).total, 1);
  assert.equal((await call(queue, otherAgency)).total, 0);
  assert.equal(
    (await call(`/ops/queue?search=${id}&intent=BAGGAGE`, agency)).total,
    0,
  );
  await call(`/ops/queue?search=${id}&intent=invalid`, agency, 400);
  assert((await call(exportPath, agency)).includes(id));
  assert(!(await call(exportPath, otherAgency)).includes(id));
  assert(
    !(
      await call(`/ops/queue/export?search=${id}&intent=BAGGAGE`, agency)
    ).includes(id),
  );
  assert.equal((await call(emQueue, manager)).total, 0);
  await call(`${queue}&em=1`, agency, 403);
  await call(`${exportPath}&em=1`, agency, 403);

  const request = {
    requestId: randomUUID(),
    reason: "Private synthetic escalation reason",
  };
  await call(escalate, null, 401, request);
  await call(escalate, agency, 403, request);
  await call(escalate, supplier, 403, request);
  await call(escalate, foreignAgent, 404, request);
  await call(escalate, agent, 400, { ...request, reason: "  " });
  const [first, retry] = await Promise.all([
    call(escalate, agent, 201, request),
    call(escalate, agent, 201, request),
  ]);
  assert(first.alertId);
  assert.equal(first.alertId, retry.alertId);
  await call(escalate, agent, 400, { ...request, requestId: randomUUID() });

  const after = await call(detail, manager);
  assert.equal(after.priority, "URGENT");
  assert.equal(after.escalationOwnerId, "manager");
  for (const field of [
    "agentId",
    "deadline",
    "responseDeadline",
    "bookingId",
    "status",
    "slaSnapshot",
  ])
    assert.deepEqual(after[field], before[field], field);
  assert.deepEqual((await call(emQueue, manager)).ids, [id]);
  assert.equal((await call(`${queue}&em=1`, foreignAgent)).total, 0);
  const alerts = (await call("/ops/workspace?compact=1", manager))
    .notifications;
  assert(
    alerts.some(
      ({ id: alertId, kind }) =>
        alertId === first.alertId && kind === "EM_ESCALATED",
    ),
  );
  const events = (await call(`${detail}/events`, manager)).items;
  const recorded = events.filter(({ kind }) => kind === "EM_ESCALATED");
  assert.equal(recorded.length, 1);
  assert.equal(recorded[0].actorId, "agent-asia");
  assert(recorded[0].text.includes(request.reason));
  assert(
    !(await call(`${detail}/events`, agency)).items.some(
      ({ kind }) => kind === "EM_ESCALATED",
    ),
  );
  const ack = `${detail}/alerts/${first.alertId}/acknowledge`;
  await call(ack, agent, 403, {});
  await call(ack, manager, 201, {});
  assert.equal((await call(emQueue, manager)).total, 0);
  assert.equal(
    (await call(escalate, agent, 201, request)).alertId,
    first.alertId,
  );
  assert.equal((await call(emQueue, manager)).total, 0);
  const second = await call(escalate, agent, 201, {
    ...request,
    requestId: randomUUID(),
  });
  assert.notEqual(second.alertId, first.alertId);
  await pool.query('UPDATE "TravelTicket" SET status=$2 WHERE id=$1', [
    id,
    "CLOSED",
  ]);
  assert.equal((await call(emQueue, manager)).total, 0);
  await call(escalate, agent, 400, { ...request, requestId: randomUUID() });
  console.log(`TBO workflow passed ${checks} HTTP checks.`);
} finally {
  try {
    await pool.query('DELETE FROM "TravelTicket" WHERE id=$1', [id]);
    const { rowCount } = await pool.query(
      'SELECT id FROM "TravelEvent" WHERE "ticketId"=$1',
      [id],
    );
    assert.equal(rowCount, 0);
  } finally {
    await pool.end();
  }
}
