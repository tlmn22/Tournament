import assert from "node:assert/strict";
import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || "msedge", headless: true });
const context = await browser.newContext();
const page = await context.newPage();
const baseURL = process.env.PREVIEW_URL || "http://localhost:3001";
const user = { id: "11111111-1111-4111-8111-111111111111", aud: "authenticated", role: "authenticated", email: "test@example.com", email_confirmed_at: new Date().toISOString(), created_at: new Date().toISOString(), app_metadata: {}, user_metadata: {} };
let requests = 0;
let invalidLogin = true;
await page.route("https://*.supabase.co/**", async route => {
  requests++;
  const url = new URL(route.request().url());
  if (url.pathname.endsWith("/signup")) return route.fulfill({ json: { user, session: null } });
  if (url.pathname.endsWith("/resend")) return route.fulfill({ json: {} });
  if (url.pathname.endsWith("/logout")) return route.fulfill({ status: 204 });
  if (url.pathname.endsWith("/user")) return route.fulfill({ json: user });
  if (url.pathname.endsWith("/token")) {
    if (invalidLogin) return route.fulfill({ status: 400, headers: { "x-supabase-api-version": "2024-01-01" }, json: { error_code: "invalid_credentials", code: "invalid_credentials", msg: "Invalid login credentials" } });
    const payload = Buffer.from(JSON.stringify({ sub: user.id, exp: Math.floor(Date.now()/1000)+3600 })).toString("base64url");
    return route.fulfill({ json: { access_token: "eyJhbGciOiJIUzI1NiJ9." + payload + ".test", refresh_token: "test-refresh", token_type: "bearer", expires_in: 3600, user } });
  }
  return route.fulfill({ status: 400, json: { message: "Unexpected mocked endpoint" } });
});

try {
  await page.goto(baseURL + "/register");
  await page.getByLabel("Имэйл", { exact: true }).fill("test@example.com");
  await page.getByLabel("Нууц үг", { exact: true }).fill("long-test-password");
  await page.getByLabel("Нууц үг давтах").fill("different-password");
  await page.getByRole("button", { name: "Бүртгүүлэх", exact: true }).click();
  await page.getByRole("alert").filter({ hasText: "таарахгүй" }).waitFor();
  assert.equal(requests, 0, "Mismatched password must not send a request");
  await page.getByLabel("Нууц үг давтах").fill("long-test-password");
  await page.getByRole("button", { name: "Бүртгүүлэх", exact: true }).click();
  await page.getByRole("status").filter({ hasText: "Имэйлээ шалгаад" }).waitFor();
  await page.getByRole("button", { name: "Баталгаажуулах холбоос дахин авах" }).click();
  await page.getByRole("status").filter({ hasText: "дахин илгээлээ" }).waitFor();
  await page.goto(baseURL + "/login");
  await page.getByLabel("Имэйл", { exact: true }).fill("test@example.com");
  await page.getByLabel("Нууц үг", { exact: true }).fill("long-test-password");
  await page.getByRole("button", { name: "Нэвтрэх", exact: true }).click();
  await page.getByRole("alert").filter({ hasText: "буруу" }).waitFor();
  invalidLogin = false;
  await page.getByRole("button", { name: "Нэвтрэх", exact: true }).click();
  await page.getByRole("heading", { name: "Миний бүртгэл" }).waitFor();
  await page.reload();
  await page.getByRole("heading", { name: "Миний бүртгэл" }).waitFor();
  await page.getByRole("button", { name: "Гарах", exact: true }).click();
  await page.getByRole("button", { name: "Нэвтрэх", exact: true }).waitFor();
  await page.reload();
  await page.getByRole("button", { name: "Нэвтрэх", exact: true }).waitFor();
  for (const path of ["/login", "/register"]) {
    await page.goto(baseURL + path);
    await page.locator(".auth-form").waitFor();
    for (const width of [320, 390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false);
    }
    const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    assert.deepEqual(result.violations.map(v => v.id), [], path + " accessibility");
  }
  console.log("PASS: password validation, signup confirmation, resend, invalid login, login, persistent session, signout, responsive forms, accessibility. Auth requests mocked; no accounts or emails created.");
} catch (error) { console.error(await page.locator("main").innerText()); throw error; } finally { await browser.close(); }
