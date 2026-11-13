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
const prefix = `Intake return ${randomUUID()}`;
const engine = process.env.OPSDESK_BROWSER_ENGINE || "chromium";
assert(["chromium", "firefox"].includes(engine));
const browser = await (engine === "firefox" ? firefox : chromium).launch();
try {
  const page = await browser.newPage();
  await page.goto(url);
  await page.getByLabel("Email address").fill("manager@opsdesk.demo");
  await page.getByLabel("Password", { exact: true }).fill("OpsDeskDemo!2026");
  await page.getByRole("button", { name: "Sign in to workspace" }).click();
  for (const origin of ["Bookings", "Insights", "Needs attention", "All conversations"]) {
    await page.getByRole("button", { name: origin === "Needs attention" || origin === "All conversations" ? new RegExp(`^${origin}`) : origin, exact: origin === "Bookings" || origin === "Insights" }).click();
    if (origin === "Bookings") await page.getByLabel("Search bookings").fill("Rome");
    if (origin === "Needs attention" || origin === "All conversations") {
      await page.getByLabel("Search conversations").fill("unrelated stale search");
      await page.getByLabel("Filter intent", { exact: true }).selectOption("BAGGAGE");
      await page.getByLabel("Filter status", { exact: true }).selectOption("RESOLVED");
    }
    const title = `${prefix} ${origin}`;
    await page.getByRole("button", { name: "New ticket", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Start a conversation" });
    await dialog.getByLabel("Booking", { exact: true }).selectOption("booking-0");
    await dialog.getByLabel("Subject", { exact: true }).fill(title);
    await dialog.getByLabel("Tell us what happened").fill("Please investigate the refund for this booking.");
    await dialog.getByRole("button", { name: "Create & route ticket" }).click();
    await dialog.waitFor({ state: "hidden" });
    await page.getByRole("heading", { name: title, exact: true }).waitFor();
    assert.equal(new URL(page.url()).searchParams.get("view"), null,
      `${origin}: newly created case URL must use the same inbox context as the screen`);
    if (origin === "Bookings") {
      await page.goBack();
      await page.getByRole("heading", { name: "Booking directory", exact: true }).waitFor();
      await page.goForward();
      await page.getByRole("heading", { name: title, exact: true }).waitFor();
    }
    await page.getByRole("button", { name: "Back to conversations", exact: true }).click();
    assert.equal(await page.getByLabel("Search conversations").inputValue(), "");
    for (const filter of ["Filter intent", "Filter priority", "Filter region", "Filter status", "Filter owner", "Filter deadline"])
      assert.equal(await page.getByLabel(filter, { exact: true }).inputValue(), "ALL");
    await page.getByLabel("Search conversations").fill(title);
    await page.getByRole("button", { name: title, exact: true }).click();
    await page.reload();
    await page.getByRole("button", { name: "Back to conversations", exact: true }).click();
    await page.getByLabel("Search conversations").fill(title);
    await page.getByRole("button", { name: title, exact: true }).waitFor();
  }
  console.log(`PASS: ${engine} intake from Bookings, Insights, attention and filtered inbox; URL/context consistency, native history, refresh and cleared filters.`);
} finally {
  await browser.close();
  try {
    await pool.query('DELETE FROM "TravelTicket" WHERE title LIKE $1', [prefix + "%"]);
  } finally { await pool.end(); }
}
