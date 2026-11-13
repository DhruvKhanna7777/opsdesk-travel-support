import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import dotenv from "dotenv";
import pg from "pg";
import { chromium, firefox } from "playwright";

const env = dotenv.parse(readFileSync(new URL("../backend/.env", import.meta.url)));
const url = process.env.OPSDESK_BROWSER_URL || "http://127.0.0.1:3000";
assert.equal(env.OPSDESK_DEMO, "true");
for (const value of [url, env.DATABASE_URL])
  assert(["127.0.0.1", "localhost"].includes(new URL(value).hostname));
const pool = new pg.Pool({ connectionString: env.DATABASE_URL });
const title = `Intake retry ${randomUUID()}`;
const description = "Please investigate the pending refund for my booking.";
const engine = process.env.OPSDESK_BROWSER_ENGINE || "chromium";
assert(["chromium", "firefox"].includes(engine));
const browser = await (engine === "firefox" ? firefox : chromium).launch();
try {
  const page = await browser.newPage();
  const submissions = [];
  page.on("request", (request) => {
    if (request.method() === "POST" && new URL(request.url()).pathname === "/api/backend/ops/tickets")
      submissions.push(request.postDataJSON());
  });
  await page.goto(url);
  await page.getByLabel("Email address").fill("maya@opsdesk.demo");
  await page.getByLabel("Password", { exact: true }).fill("OpsDeskDemo!2026");
  await page.getByRole("button", { name: "Sign in to workspace" }).click();
  const dialog = page.getByRole("dialog", { name: "Start a conversation" });
  async function fill() {
    await page.getByRole("button", { name: "New ticket", exact: true }).click();
    await dialog.getByLabel("Booking", { exact: true }).selectOption("booking-0");
    await dialog.getByLabel("Subject", { exact: true }).fill(title);
    await dialog.getByLabel("Tell us what happened").fill(description);
  }
  await fill();
  // Commit the request, then discard its response to simulate a broken network.
  await page.route("**/api/backend/ops/tickets", async (route) => {
    const response = await route.fetch();
    assert.equal(response.status(), 201);
    await route.abort();
  }, { times: 1 });
  await dialog.getByRole("button", { name: "Create & route ticket" }).click();
  await dialog.getByRole("alert").waitFor();
  await dialog.getByLabel("Tell us what happened").fill("Changed details after the original save response was lost.");
  await dialog.getByRole("button", { name: "Create & route ticket" }).click();
  await dialog.getByRole("alert").filter({ hasText: /already saved/ }).waitFor();
  await dialog.getByLabel("Tell us what happened").fill(description);
  await dialog.getByRole("button", { name: "Create & route ticket" }).click();
  await dialog.waitFor({ state: "hidden" });
  await page.getByRole("heading", { name: title, exact: true }).waitFor();
  const firstId = new URL(page.url()).searchParams.get("case");
  const { rows: [{ count }] } = await pool.query(
    'SELECT count(*)::int AS count FROM "TravelTicket" WHERE title=$1', [title]);
  assert.equal(count, 1, "A retry after a committed-but-lost response must not duplicate the case");
  assert.equal(submissions.length, 3);
  assert.match(submissions[0].requestId, /^[0-9a-f-]{36}$/);
  assert.equal(submissions[0].requestId, submissions[1].requestId);
  assert.equal(submissions[0].requestId, submissions[2].requestId);
  for (const [table, filter] of [["TravelMessage", ""], ["TravelEvent", " AND kind='CREATED'"], ["TravelEvent", " AND kind='ASSIGNED'"]]) {
    const { rows: [{ count: n }] } = await pool.query(
      `SELECT count(*)::int AS count FROM "${table}" WHERE "ticketId"=$1${filter}`, [firstId]);
    assert.equal(n, 1);
  }
  await page.getByRole("button", { name: /All conversations/ }).click();
  await fill();
  await dialog.getByRole("button", { name: "Create & route ticket" }).click();
  await dialog.waitFor({ state: "hidden" });
  assert.notEqual(new URL(page.url()).searchParams.get("case"), firstId,
    "A deliberately new submission with identical wording must remain a separate complaint");
  assert.notEqual(submissions[3].requestId, submissions[0].requestId);
  console.log(`PASS: ${engine} lost-response retry creates one case/message/audit; a fresh form creates a separate complaint.`);
} finally {
  await browser.close();
  try {
    await pool.query('DELETE FROM "TravelTicket" WHERE title=$1', [title]);
  } finally { await pool.end(); }
}
