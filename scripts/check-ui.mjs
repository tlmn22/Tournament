import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const baseURL = process.env.PREVIEW_URL || "http://localhost:3001";
const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || "msedge", headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" });
const page = await context.newPage();
const errors = [];
page.on("pageerror", error => errors.push(error.message));
const makeTournament = (number, name, start_date, end_date, status = "published") => ({
  id: "aaaaaaaa-aaaa-4aaa-8aaa-" + String(number).padStart(12, "0"),
  owner_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  name, start_date, end_date, status, description: "", created_at: "2026-01-01T00:00:00Z",
});
const ongoing = makeTournament(1, "Бодь Games 2026", "2026-11-07", "2026-11-10");
const lastDay = makeTournament(2, "Өнөөдөр дуусах цом", "2026-11-01", "2026-11-07");
const completed = makeTournament(3, "Өмнөх улирлын цом", "2026-10-01", "2026-11-06");
const upcoming = makeTournament(4, "Ирэх улирлын цом", "2026-11-08", "2026-11-09");
const undated = makeTournament(5, "Хугацаа зарлаагүй цом", null, null);
let tournaments = [ongoing, lastDay, completed, upcoming, undated,
  ...Array.from({ length: 19 }, (_, i) => makeTournament(10 + i, "Архив " + String(i + 1).padStart(2, "0"), "2025-01-01", "2025-01-02")),
  makeTournament(99, "Нууц ноорог", "2026-11-06", "2026-11-09", "draft")];
let failList = false;
await context.route("https://*.supabase.co/**", async route => {
  const request = route.request();
  assert.equal(request.method(), "GET", "Directory must not mutate tournament data");
  const url = new URL(request.url());
  const table = url.pathname.split("/").at(-1);
  if (table === "tournaments") {
    assert.equal(url.searchParams.get("status"), "eq.published", "Public listing must exclude drafts, including for signed-in owners");
    if (failList && !url.searchParams.has("id")) {
      return route.fulfill({ status: 503, json: { message: "Simulated loading error" } });
    }
    let rows = tournaments.filter(t => t.status === "published");
    if (url.searchParams.has("id")) rows = rows.filter(t => t.id === url.searchParams.get("id").slice(3));
    const offset = Number(url.searchParams.get("offset") || 0);
    const limit = Number(url.searchParams.get("limit") || 1000);
    rows = rows.slice(offset, offset + limit);
    const single = (request.headers().accept || "").includes("vnd.pgrst.object");
    return route.fulfill({ json: single ? rows[0] || null : rows });
  }
  return route.fulfill({ json: [] });
});
// At this UTC instant it is already November 7 in Ulaanbaatar.
await page.clock.install({ time: new Date("2026-11-06T16:30:00Z") });
const table = () => page.getByRole("table");
const rows = () => table().locator("tbody tr");
const rowFor = name => rows().filter({ has: page.getByRole("link", { name, exact: true }) });
const chip = label => page.getByRole("group", { name: "Тэмцээний төлөв" }).getByRole("button", { name: new RegExp("^" + label + " \\d+$") });
const openHome = async () => {
  await page.goto(baseURL);
  await expect(page.getByRole("heading", { name: "Тэмцээнүүд", exact: true })).toBeVisible();
  await expect(table()).toBeVisible();
};
try {
  await mkdir(".preview", { recursive: true });
  await openHome();
  await expect(page).toHaveTitle("Тэмцээнүүд | temtseen.app");
  await expect(page.getByRole("link", { name: "Нууц ноорог" })).toHaveCount(0);
  await expect(rows()).toHaveCount(20);
  await expect(rows().first()).toContainText(ongoing.name);
  await expect(rowFor(ongoing.name)).toContainText("Явагдаж байна");
  await expect(rowFor(lastDay.name)).toContainText("Явагдаж байна");
  await expect(rowFor(completed.name)).toContainText("Дууссан");
  await expect(rowFor(upcoming.name)).toContainText("Удахгүй");
  await expect(rowFor(undated.name)).toContainText("Хугацаа товлоогүй");
  await expect(page.locator(".hero,.tp-directory-hero,.tp-directory-cta")).toHaveCount(0);
  // Ongoing tournaments are also featured above the directory.
  await expect(page.locator(".tp-dir-feature")).toHaveCount(2);
  await expect(page.locator(".tp-dir-feature").first()).toContainText("Явагдаж байна");
  await expect(page.locator('a[href^="/#"]')).toHaveCount(0);

  await page.getByRole("button", { name: "Дараах", exact: true }).click();
  await expect(rows()).toHaveCount(4);
  await expect(page.getByRole("button", { name: "Дараах", exact: true })).toBeDisabled();
  await page.getByLabel("Тэмцээн хайх").fill("Бодь");
  await expect(rows()).toHaveCount(1);
  await expect(rows().first()).toContainText(ongoing.name);
  await page.getByLabel("Тэмцээн хайх").fill("олдохгүй нэр");
  await expect(table()).toContainText("Хайлт, шүүлтэд тохирох тэмцээн олдсонгүй.");
  await page.getByLabel("Тэмцээн хайх").fill("");
  await chip("Явагдаж байна").click();
  await expect(rows()).toHaveCount(2);
  await chip("Дууссан").click();
  await expect(rows()).toHaveCount(20);
  await chip("Удахгүй").click();
  await expect(rows()).toHaveCount(1);
  await expect(rows().first()).toContainText(upcoming.name);
  await expect(chip("Удахгүй")).toHaveAttribute("aria-pressed", "true");
  await chip("Бүгд").click();
  await page.getByRole("button", { name: "Тэмцээн", exact: true }).click();
  await expect(page.getByRole("columnheader", { name: "Тэмцээн", exact: true })).toHaveAttribute("aria-sort", "ascending");
  await expect(rows().first()).toContainText("Архив 01");
  await page.getByRole("button", { name: "Хугацаа", exact: true }).click();
  await expect(rows().first()).toContainText(upcoming.name);

  // A click anywhere in the row uses the same native link as keyboard navigation.
  const statusCell = await rowFor(ongoing.name).locator("td").nth(1).boundingBox();
  assert.ok(statusCell);
  await page.mouse.click(statusCell.x + statusCell.width / 2, statusCell.y + statusCell.height / 2);
  await expect(page).toHaveURL(baseURL + "/tournaments/" + ongoing.id);
  await expect(page.getByRole("heading", { name: ongoing.name, exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Бүх тэмцээн", exact: true }).first().click();
  await expect(page).toHaveURL(baseURL + "/tournaments");
  await expect(table()).toBeVisible();
  const link = table().getByRole("link", { name: ongoing.name, exact: true });
  await link.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(baseURL + "/tournaments/" + ongoing.id);

  await openHome();
  for (const width of [1440, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, "Page overflow at " + width);
    if (width === 1440 || width === 390) {
      await page.screenshot({ path: ".preview/directory-" + width + ".png", fullPage: true });
      const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
      assert.deepEqual(result.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })), []);
    }
  }
  await page.getByRole("button", { name: "Цэс нээх" }).click();
  await expect(page.getByRole("navigation", { name: "Гар утасны цэс" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Цэс нээх" })).toHaveAttribute("aria-expanded", "false");
  for (const path of ["/tournaments", "/login", "/register"]) {
    const response = await page.goto(baseURL + path);
    assert.equal(response.status(), 200);
    await expect(page.locator("h1")).toHaveCount(1);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, path + " overflow");
  }
  failList = true;
  await page.goto(baseURL);
  await expect(page.getByRole("alert").filter({ hasText: "Дахин оролдох" })).toBeVisible({ timeout: 20000 });
  failList = false;
  await page.getByRole("button", { name: "Дахин оролдох" }).click();
  await expect(table()).toBeVisible();

  // Ensure the API's 1,000-row limit cannot silently hide older tournaments.
  tournaments = Array.from({ length: 1001 }, (_, i) => makeTournament(1000 + i, i === 1000 ? "Сүүлийн тэмцээн" : "Тэмцээн " + i, null, null));
  await openHome();
  await page.getByLabel("Тэмцээн хайх").fill("Сүүлийн тэмцээн");
  await expect(page.getByRole("link", { name: "Сүүлийн тэмцээн", exact: true })).toBeVisible();
  tournaments = [];
  await openHome();
  await expect(table()).toContainText("Нийтлэгдсэн тэмцээн хараахан алга.");
  assert.deepEqual(errors, []);
  console.log("PASS: public directory, inclusive Mongolia dates, search/filter/sort/pagination, all API pages, row and keyboard navigation, empty/error/retry, responsive routes, menu and accessibility. Supabase requests mocked.");
} finally {
  await browser.close();
}