import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import dotenv from "dotenv";
import pg from "pg";

const env = dotenv.parse(readFileSync(new URL("../backend/.env", import.meta.url)));
const base = process.env.OPSDESK_TEST_URL || "http://127.0.0.1:3001";
assert.equal(env.OPSDESK_DEMO, "true");
for (const value of [env.DATABASE_URL, base])
  assert(["127.0.0.1", "localhost"].includes(new URL(value).hostname));
const pool = new pg.Pool({ connectionString: env.DATABASE_URL });
const reference = `VERIFY-${randomUUID().slice(0, 8)}`.toUpperCase();
const created = [];
let coverage = [];
let checks = 0;
async function call(path, token, body, expected = 200, method = "GET") {
  const response = await fetch(base + path, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const result = await response.json();
  assert.equal(response.status, expected, `${path}: ${JSON.stringify(result)}`);
  checks++;
  return result;
}
async function login(account) {
  return (await call("/auth/login", null,
    { email: `${account}@opsdesk.demo`, password: "OpsDeskDemo!2026" }, 200, "POST")).accessToken;
}
try {
  const manager = await login("manager");
  const customer = await login("maya");
  const asia = await login("asia");
  const europe = await login("europe");
  const workspace = await call("/ops/workspace?compact=1", manager);
  const cutoff = new Date(+new Date(workspace.now) + 4 * 3600000).toISOString();
  await pool.query(`INSERT INTO "TravelBooking"
    (id,reference,"agencyId","customerId","supplierId",destination,region,service,
     "checkInAt","cancellationCutoffAt",timezone)
    SELECT $1,$1,"agencyId","customerId","supplierId",'Synthetic Europe trip','EUROPE',service,
      $2::timestamp + interval '2 days',$2::timestamp,'Europe/Paris'
    FROM "TravelBooking" WHERE reference='BK-1042'`, [reference, cutoff]);
  async function intake() {
    const ticket = await call("/ops/tickets", customer, {
      title: reference + " missing booking", description: "Please locate the booking for my trip and review cancellation.", category: "CANCELLATION",
    }, 201, "POST");
    created.push(ticket.id);
    assert.equal(ticket.region, "ASIA");
    assert.equal(ticket.bookingId, null);
    return ticket;
  }
  const ticket = await intake();
  await pool.query('UPDATE "TravelTicket" SET "agentId"=\'agent-asia\' WHERE id=$1', [ticket.id]);
  const path = `/ops/tickets/${ticket.id}`;
  await call(path, asia, { bookingReference: reference }, 400, "PATCH");
  await call(path, customer, { bookingReference: reference }, 403, "PATCH");
  await call(path, manager, { bookingReference: "BK-1043" }, 400, "PATCH");
  await call(path, manager, { bookingReference: reference, agentId: "agent-asia" }, 400, "PATCH");
  assert.equal((await call(path, manager)).bookingId, null, "Rejected verification must roll back");
  await call(`${path}/escalate-to-em`, asia,
    { requestId: randomUUID(), reason: "Review the booking's destination region." }, 201, "POST");
  const linked = await call(path, manager, { bookingReference: reference }, 200, "PATCH");
  assert.equal(linked.bookingId, reference);
  assert.equal(linked.region, "EUROPE");
  assert.equal(linked.deadline, cutoff);
  assert(["agent-europe", "agent-global"].includes(linked.agentId));
  assert.equal(linked.responseDeadline, ticket.responseDeadline);
  assert.equal(linked.escalationOwnerId, "manager");
  await call(path, manager, { bookingReference: "BK-1042" }, 400, "PATCH");
  await call(path, asia, undefined, 404);
  await call(path, europe);
  const events = await call(`${path}/events`, manager);
  assert(events.items.some((e) => e.kind === "REGION_CHANGED" && e.text.includes("ASIA") && e.text.includes("EUROPE")));
  assert(events.items.some((e) => e.kind === "ASSIGNED"));

  const explicit = await intake();
  const assigned = await call(`/ops/tickets/${explicit.id}`, manager,
    { bookingReference: reference, agentId: "agent-europe" }, 200, "PATCH");
  assert.equal(assigned.agentId, "agent-europe");

  const uncovered = await intake();
  coverage = (await pool.query(`SELECT "userId",available,"maxActiveCases" FROM "TravelProfile" WHERE kind='AGENT' AND region IN ('EUROPE','GLOBAL')`)).rows;
  await pool.query(`UPDATE "TravelProfile" SET available=false WHERE "userId"=ANY($1::text[])`, [coverage.map((p) => p.userId)]);
  const unassigned = await call(`/ops/tickets/${uncovered.id}`, manager,
    { bookingReference: reference }, 200, "PATCH");
  assert.equal(unassigned.region, "EUROPE");
  assert.equal(unassigned.agentId, null, "No destination coverage must leave the case unassigned");

  const capped = await intake();
  const { rows: [{ count }] } = await pool.query(`SELECT count(*)::int AS count FROM "TravelTicket"
    WHERE "agentId"='agent-europe' AND status NOT IN ('CLOSED','RESOLVED')`);
  assert(count > 0, "The seed must have active European workload for the capacity check");
  await pool.query(`UPDATE "TravelProfile" SET available=true,"maxActiveCases"=$1 WHERE "userId"='agent-europe'`, [count]);
  const atCapacity = await call(`/ops/tickets/${capped.id}`, manager,
    { bookingReference: reference }, 200, "PATCH");
  assert.equal(atCapacity.agentId, null, "Destination capacity must gate automatic assignment");
  console.log(`PASS: ${checks} regional verification HTTP checks; manager correction, access boundaries, rollback, routing, explicit owner, deadline and unavailable-agent fallback.`);
} finally {
  try {
    for (const profile of coverage)
      await pool.query('UPDATE "TravelProfile" SET available=$2,"maxActiveCases"=$3 WHERE "userId"=$1', [profile.userId, profile.available, profile.maxActiveCases]);
    await pool.query('DELETE FROM "TravelTicket" WHERE id=ANY($1::text[])', [created]);
    await pool.query('DELETE FROM "TravelBooking" WHERE id=$1', [reference]);
  } finally { await pool.end(); }
}
