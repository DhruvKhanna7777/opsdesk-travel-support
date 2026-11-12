import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import dotenv from "dotenv";
import pg from "pg";

const env = dotenv.parse(
  readFileSync(new URL("../backend/.env", import.meta.url)),
);
assert.equal(env.OPSDESK_DEMO, "true");
assert.equal(new URL(env.DATABASE_URL).hostname, "127.0.0.1");
const pool = new pg.Pool({ connectionString: env.DATABASE_URL });
const base = process.env.OPSDESK_TEST_URL || "http://127.0.0.1:3001";
const prefix = `pagination-${randomUUID()}`;
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
const login = async (account) =>
  (
    await call("/auth/login", null, 200, {
      email: `${account}@opsdesk.demo`,
      password: "OpsDeskDemo!2026",
    })
  ).accessToken;
async function allPages(path, token, expected) {
  const first = await call(path, token);
  const items = [];
  for (let page = 1; page <= first.totalPages; page++) {
    const result =
      page === 1 ? first : await call(`${path}?page=${page}`, token);
    assert.equal(result.page, page, path);
    items.push(...result.items);
    assert(result.items.length <= 20);
    assert.equal(result.total, expected);
  }
  assert.equal(items.length, expected);
  assert.equal(
    new Set(items.map((item) => item.id)).size,
    expected,
    `Duplicate directory IDs for ${path}`,
  );
  const last = await call(`${path}?page=10000`, token);
  assert.equal(last.page, last.totalPages);
  for (const invalid of ["0", "-1", "1.5", "abc", "10001"])
    await call(`${path}?page=${invalid}`, token, 400);
  return items;
}
try {
  const roles = {
    manager: { id: "manager", staff: true },
    maya: {
      id: "customer-0",
      scope: { agencyId: "atlas", customerId: "customer-0" },
    },
    agency: { id: "agency-atlas", scope: { agencyId: "atlas" } },
    horizon: { id: "agency-horizon", scope: { agencyId: "horizon" } },
    asia: { id: "agent-asia", staff: true, scope: { region: "ASIA" } },
    europe: { id: "agent-europe", staff: true, scope: { region: "EUROPE" } },
    supplier: { id: "supplier-user", supplierId: "supplier-0" },
    skyline: { id: "supplier-other", supplierId: "supplier-1" },
  };
  const tokens = Object.fromEntries(
    await Promise.all(Object.keys(roles).map(async (r) => [r, await login(r)])),
  );
  const {
    rows: [source],
  } = await pool.query(
    `SELECT "agencyId", "supplierId", region FROM "TravelBooking"
     WHERE id = 'booking-0' AND reference = 'BK-1042'`,
  );
  assert(source, "Missing seeded BK-1042 booking");
  for (let i = 0; i < 45; i++) {
    const id = `${prefix}-${String(i).padStart(2, "0")}`;
    await pool.query(
      `INSERT INTO "User" (id,email,"passwordHash","firstName","lastName",role,"updatedAt") VALUES ($1,$2,'unused','Directory','Fixture','CUSTOMER',NOW())`,
      [id, `${id}@example.invalid`],
    );
    await pool.query(
      `INSERT INTO "TravelProfile" ("userId",kind,"agencyId",available,specialties) VALUES ($1,'CUSTOMER',$2,true,'{}')`,
      [id, source.agencyId],
    );
    await pool.query(
      `INSERT INTO "TravelBooking" (id,reference,"agencyId","customerId","supplierId",destination,region,service,"checkInAt",timezone) VALUES ($1,$1,$2,$3,$4,'Directory fixture',$5,'Flight',NOW(),'UTC')`,
      [id, source.agencyId, id, source.supplierId, source.region],
    );
  }
  for (let i = 0; i < 45; i++) {
    const id = `${prefix}-agent-${String(i).padStart(2, "0")}`;
    await pool.query(
      `INSERT INTO "User" (id,email,"passwordHash","firstName","lastName",role,"updatedAt") VALUES ($1,$2,'unused','Directory','Fixture','AGENT',NOW())`,
      [id, `${id}@example.invalid`],
    );
    await pool.query(
      `INSERT INTO "TravelProfile" ("userId",kind,region,available,specialties) VALUES ($1,'AGENT','GLOBAL',false,'{}')`,
      [id],
    );
  }
  // People reachable only through an authorized case/thread must remain visible.
  for (const suffix of ["unbooked", "thread-author"]) {
    const id = `${prefix}-${suffix}`;
    await pool.query(
      `INSERT INTO "User" (id,email,"passwordHash","firstName","lastName",role,"updatedAt") VALUES ($1,$2,'unused','Context','Participant','CUSTOMER',NOW())`,
      [id, `${id}@example.invalid`],
    );
    await pool.query(
      `INSERT INTO "TravelProfile" ("userId",kind,"agencyId",available,specialties) VALUES ($1,'CUSTOMER',$2,true,'{}')`,
      [id, source.agencyId],
    );
  }
  await pool.query(
    `INSERT INTO "TravelTicket" (id,reference,title,description,"agencyId","customerId",category,status,priority,region,deadline,"updatedAt") VALUES ($1,$1,'Unbooked context','Synthetic fixture',$2,$3,'REFUND','RESOLVED','LOW',$4,NOW(),NOW())`,
    [`${prefix}-context`, source.agencyId, `${prefix}-unbooked`, source.region],
  );
  await pool.query(
    `INSERT INTO "TravelConversation" (id,"ticketId","supplierId",subject,"dueAt") VALUES ($1,$2,$3,'Context fixture',NOW())`,
    [`${prefix}-thread`, `${prefix}-context`, source.supplierId],
  );
  await pool.query(
    `INSERT INTO "TravelMessage" (id,"ticketId","conversationId","senderId",visibility,content) VALUES ($1,$2,$3,$4,'SUPPLIER','Synthetic fixture')`,
    [
      `${prefix}-message`,
      `${prefix}-context`,
      `${prefix}-thread`,
      `${prefix}-thread-author`,
    ],
  );
  if (process.env.OPSDESK_DIRECTORY_BROWSER === "1") {
    const { chromium } = await import("playwright");
    const browser = await chromium.launch();
    try {
      const page = await browser.newPage();
      await page.goto(process.env.OPSDESK_WEB_URL || "http://127.0.0.1:3000");
      await page.getByLabel("Email address").fill("manager@opsdesk.demo");
      await page.getByLabel("Password").fill("OpsDeskDemo!2026");
      await page.getByRole("button", { name: "Sign in to workspace" }).click();
      await page.getByLabel("Search Filter owner").fill("Fixture");
      await page
        .getByRole("button", { name: "Older Filter owner", exact: true })
        .click();
      await page
        .getByLabel("Filter owner", { exact: true })
        .selectOption(`${prefix}-agent-20`);
      await page
        .getByRole("button", { name: "Newer Filter owner", exact: true })
        .click();
      assert.equal(
        await page.getByLabel("Filter owner", { exact: true }).inputValue(),
        `${prefix}-agent-20`,
      );
      await page
        .getByRole("button", { name: "New ticket", exact: true })
        .click();
      await page.getByLabel("Search Booking", { exact: true }).fill(prefix);
      await page
        .getByRole("button", { name: "Older Booking", exact: true })
        .click();
      await page
        .getByRole("dialog")
        .getByRole("combobox")
        .selectOption(`${prefix}-20`);
      await page
        .getByRole("button", { name: "Newer Booking", exact: true })
        .click();
      assert.equal(
        await page.getByRole("dialog").getByRole("combobox").inputValue(),
        `${prefix}-20`,
      );
      console.log(
        "PASS: browser booking and owner search, second-page selection and retained selection.",
      );
    } finally {
      await browser.close();
    }
  }
  // Derive expected IDs from fixture relationships, independently of API responses.
  const { rows: bookings } = await pool.query(
    'SELECT id, "customerId", "agencyId", region FROM "TravelBooking"',
  );
  const { rows: tickets } = await pool.query(
    'SELECT "customerId", "agencyId", region FROM "TravelTicket"',
  );
  const { rows: people } = await pool.query(
    `SELECT p."userId" AS id, p.kind, u."lastName"
     FROM "TravelProfile" p JOIN "User" u ON u.id = p."userId"`,
  );
  const { rows: threadAuthors } = await pool.query(
    `SELECT DISTINCT m."senderId", c."supplierId", t.region
     FROM "TravelMessage" m JOIN "TravelConversation" c ON c.id = m."conversationId"
     JOIN "TravelTicket" t ON t.id = c."ticketId"`,
  );
  for (const [role, { id, staff, scope = {}, supplierId }] of Object.entries(
    roles,
  )) {
    const token = tokens[role];
    const inScope = (row) =>
      Object.entries(scope).every(([key, value]) => row[key] === value);
    const expectedBookings = supplierId ? [] : bookings.filter(inScope);
    const customers = supplierId
      ? []
      : [
          ...expectedBookings.map((b) => b.customerId),
          ...tickets.filter(inScope).map((t) => t.customerId),
        ];
    const authors = threadAuthors
      .filter((row) =>
        supplierId ? row.supplierId === supplierId : staff && inScope(row),
      )
      .map((row) => row.senderId);
    const visibleIds = new Set([id, ...customers, ...authors]);
    const expectedPeople = people.filter(
      (person) =>
        visibleIds.has(person.id) || ["AGENT", "MANAGER"].includes(person.kind),
    );

    const bookingItems = await allPages(
      "/ops/bookings",
      token,
      expectedBookings.length,
    );
    const peopleItems = await allPages(
      "/ops/people",
      token,
      expectedPeople.length,
    );
    for (const [actual, expected] of [
      [bookingItems, expectedBookings],
      [peopleItems, expectedPeople],
    ]) {
      assert.deepEqual(
        actual.map((row) => row.id).sort(),
        expected.map((row) => row.id).sort(),
        `Directory scope differs for ${role}`,
      );
    }
    if (role !== "manager")
      assert(
        peopleItems.every(
          (p) => !("specialties" in p) && !("maxActiveCases" in p),
        ),
      );
    const compact = await call("/ops/workspace?compact=1", token);
    assert.deepEqual(compact.bookings, []);
    assert.deepEqual(compact.people, []);
    const filtered = await call(`/ops/bookings?search=${prefix}`, token);
    const matchingBookings = expectedBookings.filter((b) =>
      b.id.startsWith(prefix),
    );
    assert.equal(filtered.total, matchingBookings.length);
    assert.deepEqual(
      filtered.items.map((b) => b.id),
      matchingBookings
        .map((b) => b.id)
        .sort()
        .slice(0, 20),
    );
    const named = await call("/ops/people?search=Fixture", token);
    const matchingPeople = new Set(
      expectedPeople.filter((p) => p.lastName === "Fixture").map((p) => p.id),
    );
    assert.equal(named.total, matchingPeople.size);
    assert(named.items.every((p) => matchingPeople.has(p.id)));
    const agents = await call("/ops/people?kind=AGENT", token);
    assert.equal(
      agents.total,
      expectedPeople.filter((p) => p.kind === "AGENT").length,
    );
    assert(agents.items.every((p) => p.kind === "AGENT"));
  }
  for (const path of ["/ops/bookings", "/ops/people"]) {
    await call(path, null, 401);
    await call(`${path}?search=${"x".repeat(101)}`, tokens.manager, 400);
    await call(`${path}?kind=INVALID`, tokens.manager, 400);
  }
  console.log(
    `PASS: ${checks} directory HTTP checks; multi-page fixtures, scope, search, validation, compact metadata.`,
  );
} finally {
  await pool.query('DELETE FROM "TravelTicket" WHERE id LIKE $1', [
    `${prefix}%`,
  ]);
  await pool.query('DELETE FROM "TravelBooking" WHERE id LIKE $1', [
    `${prefix}%`,
  ]);
  await pool.query('DELETE FROM "TravelProfile" WHERE "userId" LIKE $1', [
    `${prefix}%`,
  ]);
  await pool.query('DELETE FROM "User" WHERE id LIKE $1', [`${prefix}%`]);
  await pool.end();
}
