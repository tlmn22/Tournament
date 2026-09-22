import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const baseURL = process.env.PREVIEW_URL || "http://localhost:3000";
const channel = process.env.BROWSER_CHANNEL || "msedge";
const browser = await chromium.launch({ channel, headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" });
const page = await context.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });

try {
  await mkdir(".preview", { recursive: true });
  const response = await page.goto(baseURL, { waitUntil: "networkidle" });
  assert.equal(response.status(), 200);
  await page.evaluate(() => document.fonts.ready);
  assert.match(await page.title(), /Tournament/);
  assert.equal(await page.locator("html").getAttribute("lang"), "mn");
  await page.screenshot({ path: ".preview/desktop.png", fullPage: true });

  await page.getByRole("tab", { name: "Тоглолтын хуваарь" }).click();
  assert.equal(await page.getByRole("tabpanel").getByText("10:00", { exact: true }).count(), 1);
  await page.getByRole("tab", { name: "Тоглолтын хуваарь" }).press("ArrowRight");
  assert.equal(await page.getByRole("tab", { name: "Тэмцээний шатлал" }).getAttribute("aria-selected"), "true");
  assert.equal(await page.getByRole("tabpanel").getByText("ШИГШЭЭ", { exact: true }).count(), 1);
  await page.getByRole("tab", { name: "Баг, бүрэлдэхүүн" }).click();
  await page.locator(".faq-item").first().locator("summary").click();
  assert.equal(await page.locator(".faq-item").first().getAttribute("open"), "");
  await page.locator(".faq-item").first().locator("summary").click();

  const desktopA11y = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  console.log("Desktop accessibility:", JSON.stringify(desktopA11y.violations.map(({ id, impact, nodes }) => ({ id, impact, nodes: nodes.map(({ target, failureSummary }) => ({ target, failureSummary })) })), null, 2));

  for (const width of [1024, 768, 390, 360, 320]) {
    await page.setViewportSize({ width, height: 844 });
    const overflow = await page.evaluate(() => ({ width: window.innerWidth, scroll: document.documentElement.scrollWidth }));
    assert.ok(overflow.scroll <= width, `Horizontal overflow at ${width}px: ${overflow.scroll}`);
    if (width === 390) {
      await page.screenshot({ path: ".preview/mobile.png", fullPage: true });
      await page.getByRole("button", { name: "Цэс нээх" }).click();
      assert.equal(await page.getByRole("navigation", { name: "Гар утасны цэс" }).isVisible(), true);
      await page.keyboard.press("Escape");
      assert.equal(await page.getByRole("button", { name: "Цэс нээх" }).getAttribute("aria-expanded"), "false");
      await page.getByRole("button", { name: "Цэс нээх" }).click();
      await page.getByRole("navigation", { name: "Гар утасны цэс" }).getByRole("link", { name: "Тэмцээнүүд", exact: true }).click();
      await page.waitForURL("**/tournaments");
      assert.equal(await page.getByRole("navigation", { name: "Гар утасны цэс" }).count(), 0);
      await page.goto(baseURL, { waitUntil: "networkidle" });
    }
  }

  for (const route of ["/tournaments", "/login", "/register"]) {
    const routeResponse = await page.goto(`${baseURL}${route}`, { waitUntil: "networkidle" });
    assert.equal(routeResponse.status(), 200, `${route} status`);
    assert.equal(await page.locator("h1").count(), 1, `${route} heading`);
    const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    assert.equal(hasOverflow, false, `${route} horizontal overflow`);
  }
  const missingResponse = await page.goto(`${baseURL}/not-a-real-page`, { waitUntil: "networkidle" });
  assert.equal(missingResponse.status(), 404);
  assert.equal(errors.filter((message) => !message.includes("404")).length, 0, errors.join("\n"));
  assert.equal(desktopA11y.violations.length, 0, "Accessibility violations found; see output.");
  console.log("PASS: routes, desktop/mobile layouts, keyboard tabs, FAQ, mobile menu, browser errors and accessibility.");
} finally {
  await browser.close();
}
