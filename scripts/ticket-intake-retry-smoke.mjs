import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import dotenv from "dotenv";
import pg from "pg";
import { PrismaService } from "../backend/dist/prisma/prisma.service.js";
import { TravelService } from "../backend/dist/src/travel/travel.service.js";
import { TravelMailService } from "../backend/dist/src/travel/travel-mail.service.js";
import { SyntheticTravelMailTransport } from "../backend/dist/src/travel/travel-mail.transport.js";

const env = dotenv.parse(readFileSync(new URL("../backend/.env", import.meta.url)));
const base = process.env.OPSDESK_TEST_URL || "http://127.0.0.1:3001";
assert.equal(env.OPSDESK_DEMO, "true");
for (const value of [base, env.DATABASE_URL])
  assert(["127.0.0.1", "localhost"].includes(new URL(value).hostname));
const pool = new pg.Pool({ connectionString: env.DATABASE_URL });
const prefix = `Retry API ${randomUUID()}`;
const keys = [];
const scopeBooking = (prefix + "-REGION").toUpperCase();
let checks = 0;
async function send(path, token, body, method = "POST") {
  const response = await fetch(base + path, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  checks++;
  return { status: response.status, body: await response.json() };
}
async function call(path, token, body, status = 201, method) {
  const result = await send(path, token, body, method);
  assert.equal(result.status, status, JSON.stringify(result.body));
  return result.body;
}
async function login(account) {
  return (await call("/auth/login", null,
    { email: `${account}@opsdesk.demo`, password: "OpsDeskDemo!2026" }, 200)).accessToken;
}
function key() { const value = randomUUID(); keys.push(value); return value; }
try {
  const customer = await login("maya");
  const agency = await login("horizon");
  const supplier = await login("supplier");
  const body = { requestId: key(), title: `${prefix} concurrent`,
    description: "Please investigate the refund for my booking.", bookingReference: "BK-1042" };
  const concurrent = await Promise.all(Array.from({ length: 3 }, () => call("/ops/tickets", customer, body)));
  assert.equal(new Set(concurrent.map((t) => t.id)).size, 1, "Concurrent retries must produce one case");
  const ticket = concurrent[0];
  assert.equal(ticket.intake, undefined, "Internal retry metadata must not appear in case responses");
  const previousDatabaseUrl = process.env.DATABASE_URL;
  process.env.DATABASE_URL = env.DATABASE_URL;
  const peerDb = new PrismaService();
  try {
    const peer = new TravelService(peerDb,
      new TravelMailService(peerDb, new SyntheticTravelMailTransport()));
    assert.equal((await peer.create("customer-0", body)).id, ticket.id,
      "A fresh service and database client must replay the API-created record");
  } finally {
    await peerDb.$disconnect();
    if (previousDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previousDatabaseUrl;
  }
  const normalized = await call("/ops/tickets", customer, {
    ...body, title: ` ${body.title} `, description: ` ${body.description} `, bookingReference: " bk-1042 ",
  });
  assert.equal(normalized.id, ticket.id);
  assert.equal(normalized.responseDeadline, ticket.responseDeadline);
  await call("/ops/tickets", customer, { ...body, description: "This is a changed complaint with the same key." }, 409);
  await call("/ops/tickets", customer, { ...body, requestId: "not-a-uuid" }, 400);
  await call("/ops/tickets", supplier, body, 403);
  const corrected = { ...body, requestId: key(), title: `${prefix} corrected validation` };
  await call("/ops/tickets", customer, { ...corrected, contractId: "not-an-active-contract" }, 400);
  await call("/ops/tickets", customer, corrected);
  const independent = await call("/ops/tickets", customer, { ...body, requestId: key() });
  assert.notEqual(independent.id, ticket.id, "New keys preserve intentionally separate complaints");

  const foreign = await call("/ops/tickets", agency, {
    ...body, bookingReference: "BK-1043", customerId: "customer-1",
  });
  assert.notEqual(foreign.id, ticket.id, "Keys are scoped to the authenticated submitter");
  assert.equal(foreign.agencyId, "horizon");
  await call(`/ops/tickets/${ticket.id}`, agency, undefined, 404, "GET");

  // A retry must not become a way to bypass a subsequent regional handoff.
  const manager = await login("manager");
  const asia = await login("asia");
  await pool.query(`INSERT INTO "TravelBooking"
    (id,reference,"agencyId","customerId","supplierId",destination,region,service,"checkInAt",timezone)
    SELECT $1,$1,"agencyId","customerId","supplierId",destination,'EUROPE',service,"checkInAt",'Europe/Paris'
    FROM "TravelBooking" WHERE reference='BK-1042'`, [scopeBooking]);
  const scopedBody = { requestId: key(), title: `${prefix} scope`, description: body.description,
    agencyId: "atlas", customerId: "customer-0" };
  const scoped = await call("/ops/tickets", asia, scopedBody);
  await call(`/ops/tickets/${scoped.id}`, manager, { bookingReference: scopeBooking }, 200, "PATCH");
  await call("/ops/tickets", asia, scopedBody, 404);

  const raceId = key();
  const raced = await Promise.all(["First distinct complaint", "Second distinct complaint"].map((description) =>
    send("/ops/tickets", customer, { ...body, requestId: raceId, title: `${prefix} conflict race`, description })));
  assert.deepEqual(raced.map((r) => r.status).sort(), [201, 409]);

  const closed = await call(`/ops/tickets/${ticket.id}`, customer,
    { status: "CLOSED", reason: "This case is complete for the synthetic test." }, 200, "PATCH");
  const replay = await call("/ops/tickets", customer, body);
  assert.equal(replay.id, ticket.id);
  assert.equal(replay.status, "CLOSED");
  assert.equal(replay.updatedAt, closed.updatedAt, "Replay must not reopen or rewrite the case");
  for (const [table, filter] of [["TravelMessage", ""], ["TravelEvent", " AND kind='CREATED'"], ["TravelEvent", " AND kind='ASSIGNED'"]]) {
    const { rows: [{ count }] } = await pool.query(
      `SELECT count(*)::int AS count FROM "${table}" WHERE "ticketId"=$1${filter}`, [ticket.id]);
    assert.equal(count, 1);
  }
  const legacy = { title: `${prefix} legacy`, description: body.description, bookingReference: body.bookingReference };
  assert.notEqual((await call("/ops/tickets", customer, legacy)).id,
    (await call("/ops/tickets", customer, legacy)).id, "Legacy callers without a key retain separate-create behavior");
  console.log(`PASS: ${checks} intake retry HTTP checks; concurrent replay, normalized payload, conflicts, actor scope, single message/audit, closed-case replay and legacy compatibility.`);
} finally {
  try {
    await pool.query('DELETE FROM "TravelTicket" WHERE title LIKE $1', [prefix + "%"]);
    await pool.query('DELETE FROM "TravelBooking" WHERE id=$1', [scopeBooking]);
    const { rows: [{ count }] } = await pool.query(
      'SELECT count(*)::int AS count FROM "TravelTicketIntake" WHERE "requestId"=ANY($1::uuid[])', [keys]);
    assert.equal(count, 0, "Intake metadata must be cleaned with its case");
  } finally { await pool.end(); }
}
