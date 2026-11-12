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
const pool = new pg.Pool({ connectionString: env.DATABASE_URL });
const prefix = `workspace-compatibility-${randomUUID()}`;
let checks = 0;
async function call(path, token, expected = 200, body) {
  const response = await fetch(base + path, {
    method: body ? "POST" : "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const result = await response.json();
  assert.equal(response.status, expected, `${path}: ${JSON.stringify(result)}`);
  checks++;
  return result;
}
const exactIds = (actual, expected, label) => {
  assert.deepEqual(
    actual.map((r) => r.id).sort(),
    expected.map((r) => r.id).sort(),
    label,
  );
};
try {
  for (const path of ["/ops/workspace", "/ops/workspace?compact=1"])
    for (const token of [null, "invalid-token"]) await call(path, token, 401);

  // The clean seed's threads belong to supplier-2, not the two login accounts.
  // Resolved fixtures avoid deadline-worker writes while proving nonempty scopes.
  for (let i = 0; i < 2; i++) {
    const fixtureId = `${prefix}-${i}`;
    const {
      rows: [booking],
    } = await pool.query('SELECT * FROM "TravelBooking" WHERE id=$1', [
      `booking-${i}`,
    ]);
    assert(booking, "Missing seeded booking");
    assert.equal(booking.supplierId, `supplier-${i}`);
    await pool.query(
      `INSERT INTO "TravelTicket" (id,reference,title,description,"bookingId","agencyId","customerId",category,status,priority,region,deadline,"updatedAt","escalationOwnerId","escalationManual","escalationOverrideUntil")
       VALUES ($1,$1,'Compatibility fixture','Synthetic fixture',$2,$3,$4,'REFUND','RESOLVED','LOW',$5,NOW(),NOW(),'manager',true,NOW()+interval '1 day')`,
      [
        fixtureId,
        booking.id,
        booking.agencyId,
        booking.customerId,
        booking.region,
      ],
    );
    await pool.query(
      `INSERT INTO "TravelConversation" (id,"ticketId","supplierId",subject,status,"dueAt") VALUES ($1,$1,$2,'Compatibility fixture','CLOSED',NOW())`,
      [fixtureId, booking.supplierId],
    );
    for (const visibility of ["CUSTOMER", "INTERNAL", "SUPPLIER"])
      await pool.query(
        `INSERT INTO "TravelMessage" (id,"ticketId","conversationId","senderId",visibility,content) VALUES ($1,$2,$3,'manager',$4,$4)`,
        [
          `${fixtureId}-${visibility}`,
          fixtureId,
          visibility === "SUPPLIER" ? fixtureId : null,
          visibility,
        ],
      );
    for (const kind of ["STATUS_CHANGED", "ASSIGNED"])
      await pool.query(
        `INSERT INTO "TravelEvent" (id,"ticketId",kind,text,"actorId") VALUES ($1,$2,$3,'IN_PROGRESS → RESOLVED: private compatibility reason','manager')`,
        [`${fixtureId}-${kind}`, fixtureId, kind],
      );
  }

  // Fixture expectations come from the synthetic DB, never from another API mode.
  const { rows: tickets } = await pool.query('SELECT * FROM "TravelTicket"');
  const { rows: bookings } = await pool.query('SELECT * FROM "TravelBooking"');
  const { rows: threads } = await pool.query(
    'SELECT * FROM "TravelConversation"',
  );
  const { rows: messages } = await pool.query('SELECT * FROM "TravelMessage"');
  const { rows: events } = await pool.query('SELECT * FROM "TravelEvent"');
  const { rows: profiles } = await pool.query(
    'SELECT "userId" AS id, kind FROM "TravelProfile"',
  );
  const { rows: agencies } = await pool.query('SELECT id FROM "TravelAgency"');
  assert(
    tickets.length && threads.length && bookings.length,
    "Seed the isolated demo first",
  );
  assert(
    messages.some((m) => m.visibility === "INTERNAL"),
    "Need private-message negative controls",
  );
  const roles = {
    manager: { id: "manager", staff: true },
    global: { id: "agent-global", staff: true },
    asia: { id: "agent-asia", staff: true, scope: { region: "ASIA" } },
    europe: { id: "agent-europe", staff: true, scope: { region: "EUROPE" } },
    agency: { id: "agency-atlas", scope: { agencyId: "atlas" } },
    horizon: { id: "agency-horizon", scope: { agencyId: "horizon" } },
    maya: {
      id: "customer-0",
      scope: { agencyId: "atlas", customerId: "customer-0" },
    },
    supplier: { id: "supplier-user", supplierId: "supplier-0" },
    skyline: { id: "supplier-other", supplierId: "supplier-1" },
  };
  for (const [account, { id, staff, scope = {}, supplierId }] of Object.entries(
    roles,
  )) {
    const { accessToken } = await call("/auth/login", null, 200, {
      email: `${account}@opsdesk.demo`,
      password: "OpsDeskDemo!2026",
    });
    const inScope = (row) =>
      Object.entries(scope).every(([key, value]) => row[key] === value);
    const expectedTickets = supplierId ? [] : tickets.filter(inScope);
    const ticketIds = new Set(expectedTickets.map((t) => t.id));
    const expectedBookings = supplierId ? [] : bookings.filter(inScope);
    const expectedThreads = threads.filter((t) =>
      supplierId
        ? t.supplierId === supplierId
        : staff && ticketIds.has(t.ticketId),
    );
    if (supplierId)
      assert(expectedThreads.length, `Missing supplier fixture for ${account}`);
    const threadIds = new Set(expectedThreads.map((t) => t.id));
    const visiblePeople = new Set([
      id,
      ...expectedTickets.map((t) => t.customerId),
      ...expectedBookings.map((b) => b.customerId),
      ...messages
        .filter((m) => threadIds.has(m.conversationId))
        .map((m) => m.senderId),
    ]);
    const full = await call("/ops/workspace", accessToken);
    assert.equal(full.me.id, id);
    exactIds(full.tickets, expectedTickets, `${account} full ticket scope`);
    exactIds(full.bookings, expectedBookings, `${account} full booking scope`);
    exactIds(
      full.conversations,
      expectedThreads,
      `${account} full thread scope`,
    );
    exactIds(
      full.people,
      profiles.filter(
        (p) => visiblePeople.has(p.id) || ["AGENT", "MANAGER"].includes(p.kind),
      ),
      `${account} full people scope`,
    );
    exactIds(
      full.agencies,
      agencies.filter((a) => staff || a.id === scope.agencyId),
      `${account} agency metadata`,
    );
    for (const ticket of full.tickets) {
      exactIds(
        ticket.messages,
        messages.filter(
          (m) =>
            m.ticketId === ticket.id &&
            (staff
              ? ["CUSTOMER", "INTERNAL"].includes(m.visibility)
              : m.visibility === "CUSTOMER"),
        ),
        `${account} ticket messages`,
      );
      const expectedEvents = events.filter(
        (e) =>
          e.ticketId === ticket.id &&
          (staff ||
            ["CREATED", "STATUS_CHANGED", "BOOKING_LINKED"].includes(e.kind)),
      );
      exactIds(ticket.events, expectedEvents, `${account} ticket events`);
      for (const event of ticket.events) {
        const original = expectedEvents.find((e) => e.id === event.id);
        assert.equal(
          event.text,
          !staff && event.kind === "STATUS_CHANGED"
            ? original.text.split(":", 1)[0]
            : original.text,
        );
      }
      exactIds(
        ticket.relatedIds.map((relatedId) => ({ id: relatedId })),
        expectedTickets.filter(
          (t) =>
            ticket.bookingId &&
            t.bookingId === ticket.bookingId &&
            t.id !== ticket.id,
        ),
        `${account} related history`,
      );
      if (!staff) {
        assert.equal(ticket.escalationOwnerId, null);
        assert.equal(ticket.escalationManual, false);
        assert.equal(ticket.escalationOverrideUntil, null);
      }
    }
    for (const thread of full.conversations)
      exactIds(
        thread.messages,
        messages.filter((m) => m.conversationId === thread.id),
        `${account} supplier messages`,
      );
    if (!staff) {
      assert.deepEqual(full.notifications, []);
      assert(
        full.people.every(
          (p) =>
            !("shiftCalendar" in p) &&
            !("specialties" in p) &&
            !("maxActiveCases" in p),
        ),
      );
    }
    const compact = await call("/ops/workspace?compact=1", accessToken);
    assert.deepEqual(compact.me, full.me);
    exactIds(
      compact.agencies,
      full.agencies,
      `${account} compact agency metadata`,
    );
    for (const key of ["tickets", "conversations", "bookings", "people"])
      assert.deepEqual(compact[key], [], `${account} compact ${key}`);
    assert.equal(compact.counts.total, expectedTickets.length);
    assert.equal(
      compact.counts.supplierThreads,
      supplierId ? expectedThreads.length : 0,
    );
    if (!staff) assert.deepEqual(compact.notifications, []);
    for (const workspace of [full, compact]) {
      assert(Number.isFinite(Date.parse(workspace.now)));
      assert.equal(typeof workspace.clockOffsetMinutes, "number");
      assert.equal(workspace.demoClockEnabled, true);
      assert.equal(workspace.assistant.mode, "RECORDS");
      assert(workspace.notifications.every((n) => ticketIds.has(n.ticketId)));
    }
    // Only compact=1 opts into metadata; explicit compact=0 remains compatible.
    if (account === "manager") {
      const explicitFull = await call("/ops/workspace?compact=0", accessToken);
      exactIds(explicitFull.tickets, expectedTickets, "Explicit full mode");
    }
  }
} finally {
  try {
    await pool.query('DELETE FROM "TravelTicket" WHERE id LIKE $1', [
      `${prefix}%`,
    ]);
    for (const table of [
      "TravelTicket",
      "TravelConversation",
      "TravelMessage",
      "TravelEvent",
    ]) {
      const {
        rows: [{ n }],
      } = await pool.query(
        `SELECT count(*)::int AS n FROM "${table}" WHERE id LIKE $1`,
        [`${prefix}%`],
      );
      assert.equal(n, 0, `Compatibility fixture cleanup: ${table}`);
    }
  } finally {
    await pool.end();
  }
}
console.log(
  `PASS: ${checks} workspace compatibility HTTP checks; nine identities, independent scopes, redaction, compact metadata and verified fixture cleanup.`,
);
