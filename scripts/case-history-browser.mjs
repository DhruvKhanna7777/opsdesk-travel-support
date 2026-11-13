import assert from "node:assert/strict";
import { chromium, firefox } from "playwright";

const url = process.env.OPSDESK_BROWSER_URL || "http://127.0.0.1:3000";
assert(["127.0.0.1", "localhost"].includes(new URL(url).hostname));
const engine = process.env.OPSDESK_BROWSER_ENGINE || "chromium";
assert(["chromium", "firefox"].includes(engine));
const browser = await (engine === "firefox" ? firefox : chromium).launch();
try {
  const page = await browser.newPage();
  await page.goto(url);
  await page.getByLabel("Email address").fill("manager@opsdesk.demo");
  await page.getByLabel("Password", { exact: true }).fill("OpsDeskDemo!2026");
  await page.getByRole("button", { name: "Sign in to workspace" }).click();
  await page.getByLabel("Search conversations").fill("OPS-1042");
  await page.getByRole("button", { name: "Hotel voucher not recognized at check-in", exact: true }).click();
  await page.getByRole("heading", { name: "Hotel voucher not recognized at check-in", exact: true }).waitFor();
  const firstCase = page.url();
  assert(new URL(firstCase).searchParams.has("case"));
  await page.goBack();
  assert.equal(page.url(), new URL(url).href, "Browser Back must return to the inbox, not leave the app");
  await page.getByLabel("Search conversations").waitFor();
  assert.equal(await page.getByLabel("Search conversations").inputValue(), "OPS-1042");
  await page.goForward();
  await page.getByRole("button", { name: /OPS-1072/ }).click();
  const relatedCase = page.url();
  assert.notEqual(relatedCase, firstCase);
  await page.goBack();
  assert.equal(page.url(), firstCase);
  await page.getByRole("button", { name: /OPS-1072/ }).waitFor();
  await page.goForward();
  assert.equal(page.url(), relatedCase);
  await page.getByRole("button", { name: "Bookings", exact: true }).click();
  await page.getByLabel("Search bookings").fill("BK-1042");
  await page.getByRole("button", { name: "View case history", exact: true }).click();
  await page.getByRole("button", { name: /^OPS-1042/ }).click();
  const bookingCase = page.url();
  await page.reload();
  await page.getByRole("button", { name: "Back to bookings", exact: true }).waitFor();
  assert.equal(page.url(), bookingCase);
  await page.goBack();
  await page.getByRole("heading", { name: "Booking directory", exact: true }).waitFor();
  await page.goForward();
  await page.getByRole("button", { name: "Back to bookings", exact: true }).click();
  await page.getByRole("heading", { name: "Booking directory", exact: true }).waitFor();
  assert.equal(new URL(page.url()).searchParams.has("case"), false);
  const historyLength = await page.evaluate(() => window.history.length);
  await page.getByRole("button", { name: "Bookings", exact: true }).click();
  assert.equal(await page.evaluate(() => window.history.length), historyLength,
    "Selecting the current view must not add duplicate history entries");
  await page.goto(new URL("?view=unknown", url).href);
  await page.getByLabel("Search conversations").waitFor();
  console.log(`PASS: ${engine} inbox Back/Forward, related-case history, booking context after refresh and in-app return.`);
} finally {
  await browser.close();
}
