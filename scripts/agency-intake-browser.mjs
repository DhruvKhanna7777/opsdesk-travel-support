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
const prefix = `Agency intake ${randomUUID()}`;
const titles = [];
const engine = process.env.OPSDESK_BROWSER_ENGINE || "chromium";
assert(["chromium", "firefox"].includes(engine));
let browser;
try {
  browser = await (engine === "firefox" ? firefox : chromium).launch();
  const page = await browser.newPage();
  await page.goto(url);
  await page.getByLabel("Email address").fill("agency@opsdesk.demo");
  await page.getByLabel("Password", { exact: true }).fill("OpsDeskDemo!2026");
  await page.getByRole("button", { name: "Sign in to workspace" }).click();
  await page.getByRole("button", { name: "New ticket", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Start a conversation" });
  const booking = dialog.getByLabel("Booking", { exact: true });
  await booking.selectOption("");
  assert.equal(await booking.getAttribute("required"), null);
  const traveler = dialog.getByLabel("Traveler", { exact: true });
  await traveler.locator('option[value="customer-0"]').waitFor({ state: "attached" });
  assert.equal(await traveler.locator('option[value="customer-1"]').count(), 0,
    "Another agency's traveler must not appear");
  assert.equal(await traveler.evaluate((select) => select.checkValidity()), false);

  // Choosing a verified booking hides the fallback; clearing it restores the
  // scoped traveler form without reusing the old booking's identity.
  await booking.selectOption("booking-0");
  assert.equal(await traveler.count(), 0);
  await booking.selectOption("");
  await traveler.selectOption("customer-0");

  for (const [index, reference] of ["UNLISTED-AGENCY-REF", ""].entries()) {
    if (index) {
      await page.getByRole("button", { name: /All conversations/ }).click();
      await page.getByRole("button", { name: "New ticket", exact: true }).click();
      await dialog.getByLabel("Traveler", { exact: true }).selectOption("customer-0");
    }
    const title = `${prefix} ${index}`;
    titles.push(title);
    await dialog.getByLabel("Booking reference (TBOH, optional)", { exact: true }).fill(reference);
    await dialog.getByLabel("Subject", { exact: true }).fill(title);
    await dialog.getByLabel("Tell us what happened", { exact: true }).fill("Please investigate this missing reservation for my traveler.");
    await dialog.getByRole("button", { name: "Create & route ticket" }).click();
    await page.getByRole("heading", { name: title, exact: true }).waitFor();
    await page.reload();
    await page.getByRole("heading", { name: title, exact: true }).waitFor();
    const { rows: [ticket] } = await pool.query(
      'SELECT * FROM "TravelTicket" WHERE title=$1', [title]);
    assert(ticket);
    assert.equal(ticket.agencyId, "atlas");
    assert.equal(ticket.customerId, "customer-0");
    assert.equal(ticket.bookingId, null);
    const { rows: messages } = await pool.query(
      'SELECT content FROM "TravelMessage" WHERE "ticketId"=$1', [ticket.id]);
    assert.equal(messages[0].content, "Please investigate this missing reservation for my traveler.");
    if (reference) {
      const { rows: events } = await pool.query(
        'SELECT text FROM "TravelEvent" WHERE "ticketId"=$1 AND kind=\'BOOKING_REVIEW_REQUIRED\'', [ticket.id]);
      assert.equal(events.length, 1);
      assert(events[0].text.includes(reference));
    }
  }
  // The same browser session cannot bypass agency scope by altering the IDs.
  // Exercise authorization with the browser's real same-origin cookie handling.
  // APIRequestContext omits Secure cookies on the HTTP loopback production build.
  const denied = await page.evaluate(async () => {
    const response = await fetch("/api/backend/ops/tickets", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Foreign traveler probe",
        description: "Must reject cross agency traveler.",
        customerId: "customer-1",
        agencyId: "horizon",
      }),
    });
    return response.status;
  });
  assert.equal(denied, 400);
  const foreignDirectory = await page.evaluate(async () => {
    const response = await fetch("/api/backend/ops/booking-requests/customers/horizon", {
      credentials: "same-origin",
    });
    return response.status;
  });
  assert.equal(foreignDirectory, 403);
  console.log("PASS: agency unmatched and missing-reference intake, persisted complaint, scoped travelers, booking switch and foreign-traveler denial.");
} finally {
  await browser?.close();
  try {
    await pool.query('DELETE FROM "TravelTicket" WHERE title=ANY($1::text[])', [titles]);
  } finally {
    await pool.end();
  }
}

// Check lost-response handling after this suite's agency fixtures are cleaned.
await import("./ticket-intake-retry-browser.mjs");
