import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const base = process.env.PREVIEW_URL || "http://localhost:3001";
const uuid = n => "bbbbbbbb-bbbb-4bbb-8bbb-" + String(n).padStart(12, "0");
const owner = uuid(1), tournamentId = uuid(2), eventId = uuid(3), otherEvent = uuid(4);
const user = { id: owner, aud: "authenticated", role: "authenticated", email: "generator@example.com", created_at: new Date().toISOString(), app_metadata: {}, user_metadata: {} };
const groups = ["A", "A", "A", "A", "B", "B", "B", "C", "C", "C", "D", "D", "D"];
const tables = {
  tournaments: [{ id: tournamentId, owner_id: owner, name: "Хуваарийн шалгалт", status: "draft", created_at: new Date().toISOString() }],
  tournament_events: [{ id: eventId, tournament_id: tournamentId, name: "Сагсанбөмбөг /ЭР/", sport: "basketball", format: "other" }, { id: otherEvent, tournament_id: tournamentId, name: "Волейбол", sport: "volleyball", format: "other" }],
  teams: groups.map((group, i) => ({ id: uuid(i + 100), tournament_event_id: eventId, company_id: uuid(5), name: "Байгууллагын баг " + (i + 1), group_name: group })),
  companies: [{ id: uuid(5), tournament_id: tournamentId, name: "Байгууллага", logo_url: null }],
  tournament_articles: [],
  tournament_fixtures: [],
};
tables.teams.push({ id: uuid(200), tournament_event_id: otherEvent, company_id: uuid(5), name: "Өөр спортын баг", group_name: "A" });
let postCount = 0, failInsert = false;
const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || "msedge", headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const errors = [];
page.on("pageerror", error => errors.push(error.message));
await context.route("https://*.supabase.co/**", async route => {
  const request = route.request(), url = new URL(request.url());
  if (url.pathname.endsWith("/token")) {
    const payload = Buffer.from(JSON.stringify({ sub: owner, exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url");
    return route.fulfill({ json: { access_token: "eyJhbGciOiJIUzI1NiJ9." + payload + ".test", refresh_token: "test-refresh", expires_in: 3600, token_type: "bearer", user } });
  }
  if (url.pathname.endsWith("/user")) return route.fulfill({ json: user });
  const table = url.pathname.split("/").at(-1);
  if (!tables[table]) return route.fulfill({ status: 404, json: { code: "PGRST205" } });
  if (request.method() === "POST") {
    postCount++;
    assert.equal(table, "tournament_fixtures");
    assert.ok(request.headers().authorization.includes("eyJhbG"));
    if (failInsert) {
      failInsert = false;
      return route.fulfill({ status: 403, json: { code: "42501", message: "Denied test request" } });
    }
    const batch = request.postDataJSON();
    assert.ok(Array.isArray(batch));
    assert.ok(batch.every(m => m.tournament_event_id === eventId));
    if (batch.some(m => tables.tournament_fixtures.some(existing => existing.id === m.id))) {
      return route.fulfill({ status: 409, json: { code: "23505" } });
    }
    await new Promise(resolve => setTimeout(resolve, 200));
    tables.tournament_fixtures.push(...batch);
    return route.fulfill({ status: 201, json: [] });
  }
  assert.equal(request.method(), "GET");
  let rows = [...tables[table]];
  for (const [key, value] of url.searchParams) {
    if (value.startsWith("eq.")) rows = rows.filter(r => String(r[key]) === value.slice(3));
    if (value.startsWith("in.(")) rows = rows.filter(r => value.slice(4, -1).split(",").includes(r[key]));
  }
  const offset = Number(url.searchParams.get("offset") || 0);
  rows = rows.slice(offset, offset + Number(url.searchParams.get("limit") || 1000));
  const single = (request.headers().accept || "").includes("vnd.pgrst.object");
  return route.fulfill({ json: single ? rows[0] || null : rows });
});
const preview = () => page.getByRole("button", { name: "Урьдчилан харах", exact: true }).click();
const generatedCount = n => page.getByRole("heading", { name: "Шинээр үүсэх · " + n + " тоглолт", exact: true });
try {
  await mkdir(".preview", { recursive: true });
  await page.goto(base + "/login");
  await page.getByLabel("Имэйл", { exact: true }).fill(user.email);
  await page.getByLabel("Нууц үг", { exact: true }).fill("test-password");
  await page.getByRole("button", { name: "Нэвтрэх", exact: true }).click();
  await page.getByRole("link", { name: "Тэмцээнээ удирдах" }).waitFor();
  await page.goto(base + "/admin/tournaments/" + tournamentId);
  await page.getByRole("button", { name: "2. Спортын тэмцээнүүд", exact: true }).click();
  await page.locator(".festival-sport-card").filter({ hasText: "Сагсанбөмбөг /ЭР/" }).getByRole("button", { name: "Баг, тоглолт удирдах" }).click();
  await page.getByRole("button", { name: "Тоглолтын хуваарь", exact: true }).click();
  await expect(page.getByLabel("Тоглолт үүсгэх хэлбэр")).toHaveValue("groups");
  await preview();
  await generatedCount(15).waitFor();
  assert.equal(await page.getByRole("region", { name: "Үүсэх тоглолтууд" }).locator("tbody tr").count(), 15);
  assert.equal(tables.tournament_fixtures.length, 0, "Preview is read-only");
  await page.getByRole("button", { name: "Болих", exact: true }).click();
  await expect(generatedCount(15)).toHaveCount(0);
  assert.equal(postCount, 0);
  await page.getByLabel("Тоглолт үүсгэх хэлбэр").selectOption("all");
  await preview();
  await generatedCount(78).waitFor();
  await page.getByLabel("Тоглолт үүсгэх хэлбэр").selectOption("groups");
  await expect(generatedCount(78)).toHaveCount(0);
  await preview();
  await generatedCount(15).waitFor();
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, "Generator overflow " + width);
    if (width === 390 || width === 1440) await page.screenshot({ path: ".preview/fixture-generator-" + width + ".png", fullPage: true });
  }
  const a11y = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  assert.deepEqual(a11y.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })), []);

  // A change since preview must require review before any insert.
  tables.teams[0].name = "Шинэчилсэн баг";
  await page.getByRole("button", { name: "15 тоглолт үүсгэх", exact: true }).click();
  await page.getByRole("alert").filter({ hasText: "мэдээлэл өөрчлөгдсөн" }).waitFor();
  assert.equal(postCount, 0);
  await expect(page.getByRole("region", { name: "Үүсэх тоглолтууд" }).getByText("Шинэчилсэн баг", { exact: true })).toHaveCount(3);
  // Same-tick double clicks produce a single request.
  await page.getByRole("button", { name: "15 тоглолт үүсгэх", exact: true }).evaluate(button => { button.click(); button.click(); });
  await page.getByRole("status").filter({ hasText: "15 тоглолт үүсгэлээ." }).waitFor();
  assert.equal(postCount, 1);
  assert.equal(tables.tournament_fixtures.length, 15);
  assert.equal(new Set(tables.tournament_fixtures.map(m => m.id)).size, 15);
  assert.ok(tables.tournament_fixtures.every(m => m.status === "scheduled" && m.home_score === null && m.away_score === null));
  await expect(page.getByRole("region", { name: "Тоглолтын хүснэгт", exact: true }).locator("tbody tr")).toHaveCount(15);
  const scored = tables.tournament_fixtures[0];
  Object.assign(scored, { status: "completed", home_score: 48, away_score: 42 });
  const savedScore = structuredClone(scored);
  await preview();
  await generatedCount(0).waitFor();
  await expect(page.getByRole("button", { name: "0 тоглолт үүсгэх" })).toHaveCount(0);
  assert.equal(postCount, 1);

  // A failed save preserves all prior matches and permits a fresh retry.
  tables.tournament_fixtures.splice(1, 1);
  await preview();
  await generatedCount(1).waitFor();
  failInsert = true;
  await page.getByRole("button", { name: "1 тоглолт үүсгэх", exact: true }).click();
  await page.getByRole("alert").filter({ hasText: "эрхгүй" }).waitFor();
  assert.equal(tables.tournament_fixtures.length, 14);
  await preview();
  await generatedCount(1).waitFor();
  await page.getByRole("button", { name: "1 тоглолт үүсгэх", exact: true }).click();
  await page.getByRole("status").filter({ hasText: "1 тоглолт үүсгэлээ." }).waitFor();
  assert.equal(tables.tournament_fixtures.length, 15);
  assert.deepEqual(tables.tournament_fixtures.find(m => m.id === scored.id), savedScore);

  tables.teams[0].group_name = null;
  await preview();
  await page.getByRole("alert").filter({ hasText: "багийн хэсгийг" }).waitFor();
  await expect(page.getByRole("region", { name: "Үүсэх тоглолтууд" })).toHaveCount(0);
  tables.teams[0].group_name = "Ганц";
  await preview();
  await page.getByRole("alert").filter({ hasText: "ганц баг" }).waitFor();
  assert.deepEqual(errors, []);
  console.log("PASS: grouped/all previews, cancel, stale-data review, double-click guard, event-scoped batch save, skip/retry, preserve scores, validation, mobile layouts and accessibility. Supabase mocked; no live data changed.");
} catch (error) {
  await page.screenshot({ path: ".preview/fixture-generator-error.png", fullPage: true });
  console.error(await page.locator("main").innerText());
  throw error;
} finally { await browser.close(); }
