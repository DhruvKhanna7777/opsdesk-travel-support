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
const prefix = `TZ-${randomUUID().slice(0, 8)}`;
const engine = process.env.OPSDESK_BROWSER_ENGINE || "chromium";
assert(["chromium", "firefox"].includes(engine));
const fixtures = [
  { month: "01", checkIn: "15 Jan, 07:00", cutoff: "14 Jan, 05:00" },
  { month: "07", checkIn: "15 Jul, 08:00", cutoff: "14 Jul, 06:00" },
];
let browser;
try {
  const { rows: [seed] } = await pool.query(
    `SELECT to_char("checkInAt", 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "checkInAt", timezone
     FROM "TravelBooking" WHERE reference='BK-1042'`);
  assert(seed);
  const seedCheckIn = new Date(seed.checkInAt).toLocaleString("en-GB", {
    timeZone: seed.timezone, day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });
  for (const fixture of fixtures) {
    fixture.id = `${prefix}-${fixture.month}`;
    await pool.query(`INSERT INTO "TravelBooking"
      (id, reference, "agencyId", "customerId", "supplierId", destination, region,
       service, "checkInAt", "cancellationCutoffAt", timezone)
      SELECT $1,$1,"agencyId","customerId","supplierId",destination,region,service,
        $2::timestamp,$3::timestamp,'America/New_York'
      FROM "TravelBooking" WHERE reference='BK-1042'`,
    [fixture.id, `2027-${fixture.month}-15T12:00:00Z`, `2027-${fixture.month}-14T10:00:00Z`]);
  }
  browser = await (engine === "firefox" ? firefox : chromium).launch();
  async function signIn(account, timezoneId) {
    const page = await browser.newPage({ timezoneId });
    await page.goto(url);
    await page.getByLabel("Email address").fill(`${account}@opsdesk.demo`);
    await page.getByLabel("Password", { exact: true }).fill("OpsDeskDemo!2026");
    await page.getByRole("button", { name: "Sign in to workspace" }).click();
    return page;
  }
  for (const timezoneId of ["Asia/Kolkata", "America/Los_Angeles"]) {
    const manager = await signIn("manager", timezoneId);
    await manager.getByLabel("Search conversations").fill("OPS-1042");
    await manager.getByRole("button", { name: "Hotel voucher not recognized at check-in", exact: true }).click();
    const caseCheckIn = manager.locator(".od-context-line").filter({ hasText: "Check-in" });
    await caseCheckIn.getByText(seed.timezone, { exact: true }).waitFor();
    assert((await caseCheckIn.innerText()).includes(seedCheckIn));
    await manager.getByRole("button", { name: "Bookings", exact: true }).click();
    await manager.getByLabel("Search bookings").fill(prefix);
    for (const fixture of fixtures) {
      const row = manager.getByRole("row").filter({ hasText: fixture.id });
      await row.getByText("America/New_York", { exact: true }).waitFor();
      assert((await row.innerText()).includes(fixture.checkIn),
        `${timezoneId}: booking directory must use the booking zone, including DST`);
    }
    await manager.getByRole("button", { name: "Booking reviews", exact: true }).click();
    const panel = manager.getByRole("dialog", { name: "Booking reviews" });
    await panel.getByLabel("Request type", { exact: true }).selectOption("CANCEL");
    await panel.getByLabel("Search Booking to cancel", { exact: true }).fill(prefix);
    for (const fixture of fixtures) {
      await panel.getByLabel("Booking to cancel", { exact: true }).selectOption(fixture.id);
      const cutoff = panel.locator("p").filter({ hasText: /^Cancellation cutoff/ });
      const text = await cutoff.innerText();
      assert(text.includes(fixture.cutoff), `${timezoneId}: LCD must use the booking zone`);
      assert(text.includes("America/New_York"));
    }
    await panel.getByRole("button", { name: "Close dialog" }).click();
    await manager.close();

    const customer = await signIn("maya", timezoneId);
    await customer.getByRole("button", { name: "Bookings", exact: true }).click();
    await customer.getByLabel("Search bookings").fill(prefix);
    for (const fixture of fixtures) {
      const card = customer.getByRole("listitem").filter({ hasText: fixture.id });
      await card.getByText("America/New_York", { exact: false }).waitFor();
      assert((await card.innerText()).includes(fixture.checkIn));
    }
    await customer.close();
  }
  console.log(`PASS: ${engine} booking directory, case context, traveler cards and cancellation LCD in two browser zones, across winter/summer DST.`);
} finally {
  await browser?.close();
  try {
    await pool.query('DELETE FROM "TravelBooking" WHERE id=ANY($1::text[])', [fixtures.map((f) => f.id).filter(Boolean)]);
  } finally { await pool.end(); }
}
