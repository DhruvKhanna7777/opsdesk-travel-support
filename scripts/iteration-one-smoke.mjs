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
const size = Number(process.env.OPSDESK_ITERATION_EXPORT_ROWS || 25);
assert(Number.isInteger(size) && size >= 25 && size <= 50_000);
const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
  options: "-c timezone=UTC",
});
const prefix = `iteration-one-${randomUUID()}`;
const thread = `${prefix}-thread`;
const member = `${prefix}-member`;
const memberEmail = `${member}@opsdesk.demo`;
let checks = 0;

async function call(path, { token, status = 200, method = "GET", body } = {}) {
  const response = await fetch(base + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  assert.equal(response.status, status, path);
  checks++;
  return response.headers.get("content-type")?.startsWith("text/csv")
    ? { headers: response.headers, csv: await response.text() }
    : response.json();
}

async function login(email) {
  const result = await call("/auth/login", {
    method: "POST",
    body: { email, password: "OpsDeskDemo!2026" },
  });
  assert(result.accessToken);
  return result.accessToken;
}

try {
  await pool.query(
    `INSERT INTO "User" (id,email,"passwordHash","firstName","lastName",role,"updatedAt")
     SELECT $1,$2,"passwordHash",'Iteration','Supplier',role,NOW() FROM "User" WHERE id='supplier-user'`,
    [member, memberEmail],
  );
  await pool.query(
    `INSERT INTO "TravelProfile" ("userId",kind,"supplierId") VALUES ($1,'SUPPLIER','supplier-0')`,
    [member],
  );
  await pool.query(
    `INSERT INTO "TravelTicket" (id,reference,title,description,"bookingId","agencyId","customerId",category,status,priority,region,deadline,"updatedAt","createdAt")
     SELECT $1,$1,'Refund from supplier','Request refund from supplier',id,"agencyId","customerId",
       'REFUND','OPEN','LOW',region,NOW()+interval '2 days',NOW(),NOW()
     FROM "TravelBooking" WHERE id='booking-0'`,
    [thread],
  );
  await pool.query(
    `INSERT INTO "TravelConversation" (id,"ticketId","supplierId",subject,"dueAt")
     VALUES ($1,$1,'supplier-0','Iteration supplier thread',NOW()+interval '2 days')`,
    [thread],
  );
  await pool.query(
    `INSERT INTO "TravelMessage" (id,"ticketId","conversationId","senderId",visibility,content)
     VALUES ($1,$2,$2,'manager','SUPPLIER','Synthetic supplier message')`,
    [`${thread}-message`, thread],
  );
  const manager = await login("manager@opsdesk.demo");
  const agent = await login("asia@opsdesk.demo");
  const foreignAgent = await login("europe@opsdesk.demo");
  const agency = await login("agency@opsdesk.demo");
  const supplier = await login("supplier@opsdesk.demo");
  const sameSupplier = await login(memberEmail);
  const otherSupplier = await login("skyline@opsdesk.demo");
  const recipientPath = `/ops/conversations/${thread}/recipients`;
  const messagePath = `/ops/conversations/${thread}/messages`;
  const themePath = `/ops/tickets/${thread}/themes`;
  const change = (path, token, body, status = 200) =>
    call(path, { token, body, status, method: "PATCH" });

  const initialRecipients = await call(recipientPath, { token: agent });
  assert.equal(initialRecipients.configured, false);
  await call(messagePath, { token: sameSupplier });
  await call(recipientPath, { token: foreignAgent, status: 404 });
  await call(recipientPath, { token: supplier, status: 403 });
  await call(recipientPath, { token: agency, status: 403 });
  await change(
    recipientPath,
    agent,
    { recipients: [{ kind: "USER", target: "supplier-other", role: "TO" }] },
    400,
  );
  await change(
    recipientPath,
    agent,
    {
      recipients: [
        { kind: "EMAIL", target: "elsewhere@opsdesk.demo", role: "TO" },
      ],
    },
    400,
  );
  const saved = {
    recipients: [
      { kind: "EMAIL", target: initialRecipients.supplierEmail, role: "CC" },
      { kind: "USER", target: member, role: "TO" },
    ],
  };
  await change(recipientPath, agent, saved);
  await change(recipientPath, agent, saved);
  await change(`/ops/tickets/${thread}`, manager, { agentId: "agent-global" });
  assert.deepEqual(
    (await call(recipientPath, { token: manager })).recipients,
    saved.recipients,
  );
  await call(messagePath, { token: sameSupplier });
  await call(messagePath, { token: supplier, status: 404 });
  await call(messagePath, { token: otherSupplier, status: 404 });
  await call(`/ops/messages/${thread}-message/attachments`, {
    token: sameSupplier,
  });
  await call(`/ops/messages/${thread}-message/attachments`, {
    token: supplier,
    status: 404,
  });
  await call(`/ops/conversations/${thread}/reply`, {
    token: supplier,
    body: { content: "Denied" },
    method: "POST",
    status: 404,
  });
  for (const [token, visible] of [
    [sameSupplier, true],
    [supplier, false],
    [otherSupplier, false],
  ]) {
    assert.equal(
      (await call("/ops/conversations", { token })).items.some(
        ({ id }) => id === thread,
      ),
      visible,
    );
    assert.equal(
      (await call("/ops/workspace", { token })).conversations.some(
        ({ id }) => id === thread,
      ),
      visible,
    );
  }
  const beforeThemes = await call("/ops/insights", { token: manager });
  for (const [theme, id] of [
    ["SUPPLIER_FOLLOW_UP", "ticket-0"],
    ["REFUND", "ticket-1"],
  ]) {
    assert(
      beforeThemes.themes
        .find((row) => row.theme === theme)
        ?.examples.some((example) => example.id === id),
    );
  }
  assert.deepEqual((await call(themePath, { token: agent })).suggestions, [
    "REFUND",
    "SUPPLIER_FOLLOW_UP",
  ]);
  await change(themePath, agency, { themes: ["REFUND"] }, 403);
  await change(themePath, agent, { themes: ["invalid"] }, 400);
  const tags = { themes: ["REFUND", "SUPPLIER_FOLLOW_UP"] };
  await change(themePath, agent, tags);
  await change(themePath, agent, tags);
  const report = await call("/ops/insights", { token: manager });
  for (const theme of tags.themes) {
    const row = report.themes.find((tag) => tag.theme === theme);
    assert.equal(
      row.count,
      (beforeThemes.themes.find((tag) => tag.theme === theme)?.count ?? 0) + 1,
    );
    assert(
      row.examples.some(
        ({ id, reference }) => id === thread && reference === thread,
      ),
    );
  }
  const regional = await call("/ops/insights", { token: foreignAgent });
  assert(
    regional.themes.every(({ examples }) =>
      examples.every(({ id }) => id !== thread),
    ),
  );
  const audit = await call(`/ops/tickets/${thread}/events`, { token: manager });
  for (const kind of ["SUPPLIER_RECIPIENTS_CHANGED", "THEMES_CHANGED"])
    assert.equal(audit.items.filter((event) => event.kind === kind).length, 1);

  const {
    rows: [{ deadlineUtc }],
  } = await pool.query(
    `UPDATE "TravelTicket" SET deadline=NOW()+interval '23 hours' WHERE id=$1
     RETURNING to_char(deadline, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "deadlineUtc"`,
    [thread],
  );
  const deadlineFilters = `tab=active&deadline=NEXT_DAY&search=${thread}`;
  assert.equal(
    (await call(`/ops/queue?${deadlineFilters}`, { token: agency })).total,
    1,
  );
  const deadlineExport = await call(`/ops/queue/export?${deadlineFilters}`, {
    token: agency,
  });
  assert(deadlineExport.csv.includes(thread));
  assert(deadlineExport.csv.includes(deadlineUtc));

  await pool.query(
    `INSERT INTO "TravelTicket" (id,reference,title,description,"bookingId","agencyId","customerId",category,status,priority,region,deadline,"updatedAt")
     SELECT $1 || '-' || lpad(n::text, 6, '0'), $1 || '-' || lpad(n::text, 6, '0'),
       CASE WHEN n=1 THEN ' =SUM(1,2) "quoted" ' ELSE '' END || $1, 'Synthetic CSV fixture',
       b.id,b."agencyId",b."customerId",'REFUND','RESOLVED','LOW',b.region,NOW(),NOW()
     FROM generate_series(1,$2::int+1) n
     JOIN "TravelBooking" b ON b.id = CASE WHEN n <= $2 THEN 'booking-0' ELSE 'booking-1' END`,
    [prefix, size],
  );
  const filters = `tab=resolved&status=RESOLVED&priority=LOW&search=${prefix}`;
  const queue = await call(`/ops/queue?${filters}`, { token: agency });
  assert.equal(queue.total, size);
  assert.equal(queue.items.length, 20);
  const csvPath = `/ops/queue/export?${filters}&page=2`;
  await call(csvPath, { status: 401 });
  await call(csvPath, { token: supplier, status: 403 });
  await call(`/ops/queue/export?${filters}&attention=1`, {
    token: agency,
    status: 403,
  });
  const { headers, csv } = await call(csvPath, { token: agency });
  assert.match(
    headers.get("content-disposition"),
    /attachment; filename="opsdesk-cases.csv"/,
  );
  assert.equal(headers.get("cache-control"), "private, no-store");
  const [header, ...rows] = csv.trimEnd().split("\r\n");
  assert.equal(
    header,
    '"Reference","Subject","Booking","Region","Category","Priority","Status","Deadline"',
  );
  assert.equal(rows.length, size);
  for (const [index, row] of rows.entries())
    assert(
      row.startsWith(`"${prefix}-${String(index + 1).padStart(6, "0")}",`),
      `Missing or duplicate export row ${index + 1}`,
    );
  assert(rows[0].includes(`"' =SUM(1,2) ""quoted"" ${prefix}"`));
  const managerExport = await call(csvPath, { token: manager });
  assert.equal(managerExport.csv.trimEnd().split("\r\n").length, size + 2);
  console.log(
    `Iteration 1 passed ${checks} HTTP checks and ${size.toLocaleString("en-US")} agency CSV rows.`,
  );
} finally {
  try {
    await pool.query('DELETE FROM "TravelTicket" WHERE id LIKE $1', [
      `${prefix}%`,
    ]);
    await pool.query('DELETE FROM "RefreshToken" WHERE "userId"=$1', [member]);
    await pool.query('DELETE FROM "TravelProfile" WHERE "userId"=$1', [member]);
    await pool.query('DELETE FROM "User" WHERE id=$1', [member]);
    const {
      rows: [{ remaining }],
    } = await pool.query(
      'SELECT count(*)::int AS remaining FROM "TravelTicket" WHERE id LIKE $1',
      [`${prefix}%`],
    );
    assert.equal(remaining, 0);
  } finally {
    await pool.end();
  }
}
