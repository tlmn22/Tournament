import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || "msedge", headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const base = process.env.PREVIEW_URL || "http://localhost:3001";
const owner = "11111111-1111-4111-8111-111111111111";
const other = "22222222-2222-4222-8222-222222222222";
const otherId = "99999999-9999-4999-8999-999999999999";
const user = { id: owner, aud: "authenticated", role: "authenticated", email: "manager@example.com", created_at: new Date().toISOString(), app_metadata: {}, user_metadata: {} };
let nextId = 10;
let pointsSaveError = "";
const tables = { tournaments: [{ id: otherId, owner_id: other, name: "Other owner cup", description: "", status: "published", start_date: null, end_date: null, created_at: new Date().toISOString() }], tournament_events: [], teams: [], companies: [], tournament_fixtures: [], tournament_articles: [], company_event_points: [] };
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aC1kAAAAASUVORK5CYII=","base64");
const errors = [];
page.on("pageerror", e => errors.push(e.message));
async function mock(route) {
  const request = route.request(), url = new URL(request.url());
  const path = url.pathname;
  if (path.endsWith("/token")) {
    const payload = Buffer.from(JSON.stringify({ sub: owner, exp: Math.floor(Date.now()/1000)+3600 })).toString("base64url");
    return route.fulfill({ json: { access_token: "eyJhbGciOiJIUzI1NiJ9."+payload+".test", refresh_token: "test-refresh", expires_in: 3600, token_type: "bearer", user } });
  }
  if (path.endsWith("/user")) return route.fulfill({ json: user });
  if (path.endsWith("/logout")) return route.fulfill({ status: 204 });
  if (path.includes("/storage/v1/object/")) {
 if (request.method() === "POST") return route.fulfill({json:{Key:path,Id:"media-id"}});
 return route.fulfill({contentType:"image/png",body:png});
 }

  if (path.endsWith("/rpc/set_company_event_points")) {
    assert.ok((request.headers().authorization || "").includes("eyJhbG"));
    if (pointsSaveError) {
      const code = pointsSaveError; pointsSaveError = "";
      return route.fulfill({ status: 500, json: { code, message: "Simulated save failure" } });
    }
    const { p_tournament_id, p_company_id, p_scores } = request.postDataJSON();
    assert.ok(tables.tournaments.some(t => t.id === p_tournament_id && t.owner_id === owner));
    const next = structuredClone(tables.company_event_points);
    for (const score of p_scores) {
      const index = next.findIndex(p => p.company_id === p_company_id && p.tournament_event_id === score.tournament_event_id);
      if ((next[index]?.points ?? null) !== score.expected_points) return route.fulfill({ status: 409, json: { code: "40001" } });
      if (score.points === null) {
        if (index >= 0) next.splice(index, 1);
      } else {
        const row = { tournament_id: p_tournament_id, company_id: p_company_id, tournament_event_id: score.tournament_event_id, points: score.points };
        if (index >= 0) next[index] = row; else next.push(row);
      }
    }
    tables.company_event_points = next;
    return route.fulfill({ json: p_scores.length });
  }

 const table = path.split("/").at(-1);
  if (!tables[table]) return route.fulfill({ status: 404, json: { code: "PGRST205", message: "Missing table" } });
  const signedIn = (request.headers().authorization || "").includes("eyJhbG");
  const visibleTournament = id => tables.tournaments.some(t => t.id === id && (t.status === "published" || (signedIn && t.owner_id === owner)));
  const visibleEvent = id => tables.tournament_events.some(e => e.id === id && visibleTournament(e.tournament_id));
  let rows = tables[table].filter(r => table === "tournaments" ? visibleTournament(r.id) : ["companies","tournament_events","tournament_articles","company_event_points"].includes(table) ? visibleTournament(r.tournament_id) : visibleEvent(r.tournament_event_id));
  if (table === "tournament_articles" && !signedIn) rows = rows.filter(r => r.status === "published");
  for (const [key,value] of url.searchParams) {
    if (value.startsWith("eq.")) rows = rows.filter(r => String(r[key]) === value.slice(3));
    if (value.startsWith("in.(")) rows = rows.filter(r => value.slice(4,-1).split(",").includes(r[key]));
  }
  if (request.method() === "POST") {
    assert.ok(signedIn);
    const values = request.postDataJSON();
    const row = { id: "aaaaaaaa-aaaa-4aaa-8aaa-" + String(nextId++).padStart(12,"0"), created_at: new Date().toISOString(), ...values };
    tables[table].push(row); rows = [row];
  } else if (request.method() === "PATCH") { assert.ok(signedIn); rows.forEach(r => Object.assign(r, request.postDataJSON())); }
  else if (request.method() === "DELETE") { assert.ok(signedIn); tables[table] = tables[table].filter(r => !rows.includes(r)); }
  const single = (request.headers().accept || "").includes("vnd.pgrst.object");
  return route.fulfill({ json: single ? rows[0] || null : rows });
}
await context.route("https://*.supabase.co/**", mock);
const form = title => page.locator("form").filter({ has: page.getByRole("heading", { name: title, exact: true }) });
try {
  await page.goto(base + "/admin");
  await page.getByRole("heading", { name: "Тэмцээнээ эндээс удирдаарай." }).waitFor();
  await page.goto(base + "/login");
  await page.getByLabel("Имэйл", { exact: true }).fill(user.email);
  await page.getByLabel("Нууц үг", { exact: true }).fill("test-password");
  await page.getByRole("button", { name: "Нэвтрэх", exact: true }).click();
  await page.getByRole("link", { name: "Тэмцээнээ удирдах" }).click();
  await page.getByRole("heading", { name: "Миний наадмууд." }).waitFor();
  assert.equal(await page.getByText("Other owner cup").count(),0);
  await page.getByRole("link", { name: "Наадам үүсгэх", exact: true }).last().click();
  await page.getByLabel("Наадмын нэр").fill("Хамтын цом 2026");
  await page.getByLabel("Танилцуулга", { exact: true }).fill("Багуудыг нэгтгэх спортын наадам.");
  await page.getByLabel("Эхлэх огноо").fill("2026-11-01");
  await page.getByLabel("Дуусах огноо").fill("2026-10-30");
  await page.getByRole("button", { name: "Наадам үүсгээд оролцогч нэмэх" }).click();
  await page.getByRole("alert").filter({ hasText: "Дуусах огноо" }).waitFor();
  await page.getByLabel("Дуусах огноо").fill("2026-11-03");
  await page.getByRole("button", { name: "Наадам үүсгээд оролцогч нэмэх" }).click();
  await page.waitForURL("**/admin/tournaments/*");
  await page.getByRole("heading", { name: "Хамтын цом 2026" }).waitFor();
  const id = tables.tournaments.find(t => t.owner_id === owner).id;
  assert.equal(tables.tournaments.find(t => t.id === id).status,"draft");

assert.equal(tables.tournament_events.length,0);
for (const name of ["УУГ", "Оффис"]) {
 await page.getByLabel("Байгууллага / нэгжийн нэр").fill(name);

 if(name === "УУГ") {
 await page.getByLabel("Багийн лого",{exact:true}).setInputFiles({name:"logo.png",mimeType:"image/png",buffer:png});
 await page.getByAltText("Багийн лого — урьдчилан харах").waitFor();
 }
 await page.getByRole("button",{name:"Оролцогч хадгалах",exact:true}).click();
 await page.getByRole("button",{name:name+" оролцогч засах",exact:true}).waitFor();
}
await page.getByRole("button",{name:"Дараагийн алхам: Спортын тэмцээнүүд"}).click();
await page.getByRole("button",{name:"Спорт хадгалах",exact:true}).click();
await page.getByRole("button",{name:"Баг, тоглолт удирдах"}).click();

  assert.equal(tables.tournament_events[0].sport,"basketball");
  assert.equal(await page.getByText("Компани нэмэх", { exact: true }).count(),0);
  await page.getByRole("heading", { name: "Баг нэмэх", exact: true }).waitFor();
  for (const name of ["Баг А", "Баг Б"]) {
    await page.getByLabel("Харьяалах оролцогч баг").selectOption(tables.companies[name === "Баг А" ? 0 : 1].id);
    await page.getByLabel("Багийн нэр", { exact: true }).fill(name);
    await form("Баг нэмэх").getByRole("button", { name: "Хадгалах", exact: true }).click();
    await page.getByRole("button", { name: name + " засах", exact: true }).waitFor();
  }
  await page.getByRole("button", { name: "Дараагийн алхам: Хуваарь үүсгэх", exact: true }).click();
  assert.equal(await page.locator("input[name=starts_at], input[name=venue], input[name=home_score]").count(),0);
  await page.getByLabel("Хоёр дахь баг", { exact: true }).selectOption(tables.teams[0].id);
  await form("Тоглолт нэмэх").getByRole("button", { name: "Хадгалах", exact: true }).click();
  await page.getByRole("alert").filter({ hasText: "Хоёр өөр баг" }).waitFor();
  await page.getByLabel("Хоёр дахь баг", { exact: true }).selectOption(tables.teams[1].id);
  await page.getByLabel("Шат / тойрог").fill("Хагас шигшээ");
  await form("Тоглолт нэмэх").getByRole("button", { name: "Хадгалах", exact: true }).click();
  await page.getByRole("button", { name: "Тоглолт / оноо засах" }).waitFor();
  assert.equal("starts_at" in tables.tournament_fixtures[0],false);
  assert.equal("venue" in tables.tournament_fixtures[0],false);
  tables.tournament_fixtures[0].starts_at = "2026-11-01T02:00:00Z";
  tables.tournament_fixtures[0].venue = "Legacy location";
  await page.getByRole("button", { name: "Тоглолт / оноо засах" }).click();
  await page.getByLabel("Эхний багийн оноо").fill("48");
  await page.getByLabel("Хоёр дахь багийн оноо").fill("42");
  await form("Тоглолт засах").getByRole("button", { name: "Хадгалах", exact: true }).click();
  await form("Тоглолт нэмэх").waitFor();
  assert.equal(tables.tournament_fixtures[0].home_score, 48, "Entering a score must not silently save null");
  assert.equal(tables.tournament_fixtures[0].away_score, 42);
  assert.equal(tables.tournament_fixtures[0].status, "completed");
  await page.getByText("Дууссан", { exact: true }).last().waitFor();
  assert.equal(tables.tournament_fixtures[0].starts_at,"2026-11-01T02:00:00Z");
  assert.equal(tables.tournament_fixtures[0].venue,"Legacy location");

  // Returning an entered result to scheduled must never silently discard it.
  await page.getByRole("button", { name: "Тоглолт / оноо засах" }).click();
  await page.getByLabel("Тоглолтын төлөв").selectOption("scheduled");
  await form("Тоглолт засах").getByRole("button", { name: "Хадгалах", exact: true }).click();
  await page.getByRole("alert").filter({ hasText: "Оноотой тоглолтыг" }).waitFor();
  assert.equal(tables.tournament_fixtures[0].home_score, 48);
  assert.equal(tables.tournament_fixtures[0].status, "completed");
  await page.getByLabel("Эхний багийн оноо").fill("");
  await page.getByLabel("Хоёр дахь багийн оноо").fill("");
  await form("Тоглолт засах").getByRole("button", { name: "Хадгалах", exact: true }).click();
  await form("Тоглолт нэмэх").waitFor();
  assert.equal(tables.tournament_fixtures[0].status, "scheduled");
  assert.equal(tables.tournament_fixtures[0].home_score, null);
  assert.equal(tables.tournament_fixtures[0].away_score, null);

  // Zero is a score; a missing opponent score is not zero.
  await page.getByRole("button", { name: "Тоглолт / оноо засах" }).click();
  await page.getByLabel("Эхний багийн оноо").fill("0");
  assert.equal(await page.getByLabel("Тоглолтын төлөв").inputValue(), "completed");
  await form("Тоглолт засах").getByRole("button", { name: "Хадгалах", exact: true }).click();
  await page.getByRole("alert").filter({ hasText: "хоёр багийн оноог" }).waitFor();
  assert.equal(tables.tournament_fixtures[0].status, "scheduled");
  await page.getByLabel("Хоёр дахь багийн оноо").fill("0");
  await form("Тоглолт засах").getByRole("button", { name: "Хадгалах", exact: true }).click();
  await form("Тоглолт нэмэх").waitFor();
  assert.equal(tables.tournament_fixtures[0].home_score, 0);
  assert.equal(tables.tournament_fixtures[0].away_score, 0);
  assert.equal(tables.tournament_fixtures[0].status, "completed");

  // Live scores stay live when entered or edited.
  await page.getByRole("button", { name: "Тоглолт / оноо засах" }).click();
  await page.getByLabel("Тоглолтын төлөв").selectOption("live");
  await page.getByLabel("Эхний багийн оноо").fill("12");
  await page.getByLabel("Хоёр дахь багийн оноо").fill("10");
  await form("Тоглолт засах").getByRole("button", { name: "Хадгалах", exact: true }).click();
  await form("Тоглолт нэмэх").waitFor();
  assert.equal(tables.tournament_fixtures[0].status, "live");
  assert.equal(tables.tournament_fixtures[0].home_score, 12);
  await page.getByRole("button", { name: "Тоглолт / оноо засах" }).click();
  await page.getByLabel("Эхний багийн оноо").fill("48");
  await page.getByLabel("Хоёр дахь багийн оноо").fill("42");
  await page.getByLabel("Тоглолтын төлөв").selectOption("completed");
  await form("Тоглолт засах").getByRole("button", { name: "Хадгалах", exact: true }).click();
  await form("Тоглолт нэмэх").waitFor();

  // The persisted score must survive reloading and reopening the editor.
  await page.reload();
  await page.getByRole("button", { name: "2. Спортын тэмцээнүүд", exact: true }).click();
  await page.getByRole("button", { name: "Баг, тоглолт удирдах" }).click();
  await page.getByRole("button", { name: "Тоглолтын хуваарь", exact: true }).click();
  await page.getByRole("button", { name: "Тоглолт / оноо засах" }).click();
  assert.equal(await page.getByLabel("Эхний багийн оноо").inputValue(), "48");
  assert.equal(await page.getByLabel("Хоёр дахь багийн оноо").inputValue(), "42");
  assert.equal(await page.getByLabel("Тоглолтын төлөв").inputValue(), "completed");
  await page.getByRole("button", { name: "Засахаа болих", exact: true }).click();

  await page.getByRole("button", { name: "Нийтлэх", exact: true }).click();
  await page.getByRole("button", { name: "Нийтлэлээс буулгах" }).waitFor();


await page.getByRole("button",{name:"2. Спортын тэмцээнүүд",exact:true}).click();
await page.getByLabel("Спортын төрөл",{exact:true}).selectOption("volleyball");
await page.getByLabel("Ангилал",{exact:true}).selectOption("Эмэгтэй");
await page.getByRole("button",{name:"Спорт хадгалах",exact:true}).click();
await page.getByRole("heading",{name:"Волейбол · Эмэгтэй",exact:true}).waitFor();
await page.getByRole("button",{name:"Баг, тоглолт удирдах"}).last().click();
await page.getByLabel("Харьяалах оролцогч баг").selectOption(tables.companies[0].id);
await page.getByLabel("Багийн нэр",{exact:true}).fill("УУГ эмэгтэй");
await page.getByLabel("Эцсийн байр (менежер оруулна)").fill("1");
await form("Баг нэмэх").getByRole("button",{name:"Хадгалах",exact:true}).click();
await page.getByRole("button",{name:"УУГ эмэгтэй засах",exact:true}).waitFor();
await page.getByRole("button",{name:"Бүх төрлийн оролцоо",exact:true}).click();

await page.getByRole("heading", { name: "Нийт оноо", exact: true }).waitFor();
const standings = page.getByRole("region", { name: "Бүх спортын оролцооны хүснэгт" });
await expect(standings.locator("tbody tr")).toHaveCount(2);
await expect(standings.locator(".tp-standing-total")).toHaveText(["Нийт", "—", "—"]);
await expect(standings.getByText("1-р байр", { exact: true })).toHaveCount(0);
const basketball = tables.tournament_events.find(e => e.sport === "basketball");
const volleyball = tables.tournament_events.find(e => e.sport === "volleyball");
const companyA = tables.companies.find(c => c.name === "УУГ");

const inputFor = event => page.locator("#company-points-" + event.id);
const savePoints = () => page.getByRole("button", { name: "Оноо хадгалах", exact: true }).click();
const savedPoints = name => page.getByRole("status").filter({ hasText: name + " компанийн оноо хадгалагдлаа." }).waitFor();
await page.getByLabel("Компани", { exact: true }).selectOption(companyA.id);
await inputFor(basketball).fill("10");
await inputFor(volleyball).fill("5.5");
await savePoints(); await savedPoints("УУГ");
await expect(standings.locator("tbody tr").first().locator(".tp-standing-total")).toHaveText("15.5");
await page.getByRole("button", { name: "Оффис оноо засах", exact: true }).click();
await inputFor(basketball).fill("20");
await inputFor(volleyball).fill("0");
await savePoints(); await savedPoints("Оффис");
await expect(standings.locator("tbody tr").first().locator("th")).toHaveAccessibleName("Оффис");
await expect(standings.locator("tbody tr").first().locator(".tp-standing-points")).toHaveText(["20", "0"]);

// Clearing a score deletes it; zero remains a deliberately awarded score.
await page.getByRole("button", { name: "Оффис оноо засах", exact: true }).click();
await inputFor(volleyball).fill("");
await savePoints(); await savedPoints("Оффис");
await expect(standings.locator("tbody tr").first().locator(".tp-standing-points")).toHaveText(["20", "—"]);

// Failed saves retain the input and do not change the standings.
await page.getByRole("button", { name: "УУГ оноо засах", exact: true }).click();
await inputFor(basketball).fill("15");
pointsSaveError = "XX000";
await savePoints();
await page.getByRole("alert").filter({ hasText: "алдаа гарлаа" }).waitFor();
assert.equal(tables.company_event_points.find(p => p.company_id === companyA.id && p.tournament_event_id === basketball.id).points, 10);
await expect(inputFor(basketball)).toHaveValue("15");
await savePoints(); await savedPoints("УУГ");
await expect(standings.locator("tbody tr").first().locator(".tp-standing-total")).toHaveText("20.5");

// An edit from another window must be reviewed, not silently overwritten.
await page.getByRole("button", { name: "УУГ оноо засах", exact: true }).click();
await inputFor(basketball).fill("16");
tables.company_event_points.find(p => p.company_id === companyA.id && p.tournament_event_id === basketball.id).points = 99;
await savePoints();
await page.getByRole("alert").filter({ hasText: "өөр цонхноос" }).waitFor();
await expect(standings.locator("tbody tr").first().locator(".tp-standing-total")).toHaveText("104.5");
await expect(inputFor(basketball)).toHaveValue("16");
await page.getByRole("button", { name: "Засахаа болих", exact: true }).click();
await page.getByRole("button", { name: "УУГ оноо засах", exact: true }).click();
await expect(inputFor(basketball)).toHaveValue("99");
await inputFor(basketball).fill("10");
await savePoints(); await savedPoints("УУГ");
await expect(standings.locator("tbody tr").first().locator("th")).toHaveAccessibleName("Оффис");
await page.reload();
await page.getByRole("button", { name: "Бүх төрлийн оролцоо", exact: true }).click();
await page.getByRole("button", { name: "УУГ оноо засах", exact: true }).click();
await expect(inputFor(basketball)).toHaveValue("10");
await expect(inputFor(volleyball)).toHaveValue("5.5");
for (const width of [320, 390, 1440]) {
  await page.setViewportSize({ width, height: 1000 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, "Points editor overflow " + width);
}
assert.deepEqual((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations.map(v => v.id), []);
await page.screenshot({ path: ".preview/company-points-admin.png", fullPage: true });
await page.getByRole("button", { name: "Засахаа болих", exact: true }).click();

await page.screenshot({path:".preview/festival-participation.png",fullPage:true});
await page.getByRole("button",{name:"Нийтлэлүүд",exact:true}).click();

await page.getByLabel("Нийтлэлийн гарчиг").fill("Наадмын дурсамж");
await page.getByLabel("Нийтлэлийн нүүр зураг",{exact:true}).setInputFiles({name:"cover.png",mimeType:"image/png",buffer:png});
await page.getByAltText("Нийтлэлийн нүүр зураг — урьдчилан харах").waitFor();
await page.getByLabel("Нийтлэлд зураг нэмэх",{exact:true}).setInputFiles({name:"moment.png",mimeType:"image/png",buffer:png});
await page.getByText("Зураг 1",{exact:true}).waitFor();
await page.getByLabel("Нийтлэлийн агуулга").fill("## Онцлох мөч\n\nБүх багтаа баярлалаа.");
await page.getByRole("button",{name:"Нийтлэл хадгалах",exact:true}).click();
await page.getByRole("heading",{name:"Наадмын дурсамж",exact:true}).waitFor();
assert.equal(tables.tournament_articles[0].status,"draft");
await page.getByRole("button",{name:"Нийтлэл засах",exact:true}).click();
await page.getByLabel("Нийтлэлийн төлөв").selectOption("published");
await page.getByRole("button",{name:"Нийтлэл хадгалах",exact:true}).click();
await page.getByRole("button",{name:"Нийтлэл засах",exact:true}).waitFor();
await mkdir(".preview", { recursive: true });

  await page.screenshot({ path: ".preview/admin-tournament.png", fullPage: true });
  tables.tournament_fixtures.push(
    { ...tables.tournament_fixtures[0], id: "bbbbbbbb-bbbb-4bbb-8bbb-000000000001", round: "Дараагийн тойрог", status: "scheduled", home_score: null, away_score: null },
    { ...tables.tournament_fixtures[0], id: "bbbbbbbb-bbbb-4bbb-8bbb-000000000002", round: "Явагдаж буй тойрог", status: "live", home_score: 12, away_score: 10 },
  );
  const visitor = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await visitor.route("https://*.supabase.co/**",mock);
  const publicPage = await visitor.newPage();
  await publicPage.goto(base + "/tournaments/" + id);
  await publicPage.getByRole("heading", { name: "Хамтын цом 2026" }).waitFor();


  // The landing view must include finished, live, and upcoming matches.
  const publicMatches = publicPage.getByRole("region", { name: "Тоглолтын хүснэгт", exact: true });
  await expect(publicPage.getByRole("button", { name: "Тоглолтууд", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(publicMatches.locator("tbody tr")).toHaveCount(3);
  await expect(publicMatches.getByText("Дууссан", { exact: true })).toHaveCount(1);
  await expect(publicMatches.getByText("Явагдаж байна", { exact: true })).toHaveCount(1);
  await expect(publicMatches.getByText("Товлосон", { exact: true })).toHaveCount(1);
  await expect(publicMatches.getByText("48", { exact: true })).toHaveCount(1);
  await publicPage.getByRole("button", { name: "Волейбол · Эмэгтэй", exact: true }).click();
  await publicPage.getByRole("heading", { name: "Тоглолт хараахан нэмээгүй байна." }).waitFor();
  await expect(publicMatches).toHaveCount(0);
  await publicPage.getByRole("button", { name: "Бүх ангилал", exact: true }).click();
  await expect(publicMatches.locator("tbody tr")).toHaveCount(3);
  await publicPage.getByRole("button", { name: "Бүх төрлийн оролцоо", exact: true }).click();

await publicPage.getByRole("region",{name:"Бүх спортын оролцооны хүснэгт"}).waitFor();

const publicStandings = publicPage.getByRole("region", { name: "Бүх спортын оролцооны хүснэгт" });
await expect(publicStandings.locator("tbody tr").first().locator("th")).toHaveAccessibleName("Оффис");
await expect(publicStandings.locator("tbody tr").nth(1).locator("th")).toHaveAccessibleName("УУГ");
await expect(publicStandings.locator("tbody .tp-standing-total")).toHaveText(["20", "15.5"]);
await expect(publicStandings.locator("tbody .tp-standing-rank")).toHaveText(["1", "2"]);
await expect(publicStandings.getByRole("button", { name: /оноо засах/ })).toHaveCount(0);
await expect(publicStandings.getByText(/тоглолт дууссан|Байр тогтоогоогүй|УУГ эмэгтэй/)).toHaveCount(0);
for (const width of [320, 390, 1440]) {
  await publicPage.setViewportSize({ width, height: 1000 });
  assert.equal(await publicPage.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, "Standings overflow " + width);
}
await publicPage.screenshot({ path: ".preview/company-points-public.png", fullPage: true });
assert.deepEqual((await new AxeBuilder({ page: publicPage }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations.map(v => v.id), []);

await publicPage.getByRole("button",{name:"Нийтлэлүүд",exact:true}).click();
await publicPage.getByRole("link").filter({hasText:"Наадмын дурсамж"}).click();

await publicPage.getByRole("heading",{name:"Онцлох мөч",exact:true}).waitFor();
assert.equal(await publicPage.locator(".festival-story img").count(),2);
await publicPage.screenshot({path:".preview/festival-article.png",fullPage:true});
await publicPage.goto(base + "/tournaments/" + id);
await publicPage.getByRole("button", { name: "Үр дүн", exact: true }).click();
  await expect(publicPage.getByRole("region", { name: "Тоглолтын хүснэгт", exact: true }).locator("tbody tr")).toHaveCount(1);
  await expect(publicPage.getByRole("region", { name: "Тоглолтын хүснэгт", exact: true }).getByText("Дууссан", { exact: true })).toHaveCount(1);

  await publicPage.getByText("48", { exact: true }).waitFor();
  await publicPage.getByText("42", { exact: true }).waitFor();
  assert.equal(await publicPage.getByText("Legacy location").count(),0);
  assert.equal(await publicPage.getByText("Цаг зарлагдаагүй").count(),0);

  // Switch the same public results into a cross-table grouped by sport.
  tables.teams.forEach(team => { team.group_name = "A"; });
  await publicPage.getByRole("button", { name: "Шинэчлэх", exact: true }).click();
  await publicPage.getByRole("button", { name: "Хэсгийн хүснэгт", exact: true }).waitFor();
  await expect(publicPage.locator(".tp-group-matrix")).toHaveCount(2);
  const matrix = publicPage.locator(".tp-group-matrix").first();
  await expect(matrix.locator("tbody tr").nth(0).locator(".tp-group-score")).toHaveText(["48:42"]);
  await expect(matrix.locator("tbody tr").nth(1).locator(".tp-group-score")).toHaveText(["42:48"]);
  await expect(matrix.locator(".tp-group-self")).toHaveCount(2);
  await expect(publicMatches).toHaveCount(0);
  await publicPage.getByRole("button", { name: "Волейбол · Эмэгтэй", exact: true }).click();
  await expect(publicPage.locator(".tp-group-matrix")).toHaveCount(1);
  await expect(publicPage.locator(".tp-group-matrix .tp-group-score")).toHaveCount(0);
  await publicPage.getByRole("button", { name: "Бүх ангилал", exact: true }).click();

  // Two completed meetings are both shown, with their own round labels.
  tables.tournament_fixtures.find(m => m.status === "live").status = "completed";
  await publicPage.getByRole("button", { name: "Шинэчлэх", exact: true }).click();
  await expect(matrix.locator("tbody tr").nth(0).locator(".tp-group-score")).toHaveText(["48:42", "12:10"]);
  await expect(matrix.locator("tbody tr").nth(1).locator(".tp-group-score")).toHaveText(["42:48", "10:12"]);
  await expect(matrix.locator("tbody tr").nth(0).getByText("Явагдаж буй тойрог", { exact: true })).toHaveCount(1);
  await publicPage.getByRole("button", { name: "Тоглолтын жагсаалт", exact: true }).click();
  await expect(publicMatches.locator("tbody tr")).toHaveCount(2);
  await expect(publicPage.locator(".tp-group-matrix")).toHaveCount(0);
  await publicPage.getByRole("button", { name: "Хэсгийн хүснэгт", exact: true }).click();
  await expect(publicPage.locator(".tp-group-matrix")).toHaveCount(2);

  await publicPage.screenshot({ path: ".preview/tournament-public.png", fullPage: true });
  for (const width of [320,390,768,1440]) {
    await publicPage.setViewportSize({ width, height: 900 });
    assert.equal(await publicPage.evaluate(() => document.documentElement.scrollWidth > innerWidth),false,"Public overflow "+width);
    await page.setViewportSize({ width, height: 900 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),false,"Admin overflow "+width);
    if (width === 390) await publicPage.screenshot({ path: ".preview/tournament-mobile.png", fullPage: true });
  }
  for (const p of [page, publicPage]) {
    const results = await new AxeBuilder({ page: p }).withTags(["wcag2a","wcag2aa","wcag21aa"]).analyze();
    assert.deepEqual(results.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })),[]);
  }
  await publicPage.getByRole("button", { name: "Багууд", exact: true }).click();
  await publicPage.getByRole("heading", { name: "Баг А", exact: true }).waitFor();
  await page.getByRole("button", { name: "Нийтлэлээс буулгах" }).click();
  await page.getByRole("button", { name: "Нийтлэх", exact: true }).waitFor();
  await publicPage.reload();
  await publicPage.getByRole("heading", { name: "Тэмцээн олдсонгүй." }).waitFor();
  await publicPage.goto(base + "/tournaments");
  await publicPage.getByRole("link", { name: "Other owner cup", exact: true }).waitFor();
  assert.equal(await publicPage.getByText("Хамтын цом 2026", { exact: true }).count(),0);
  await page.goto(base + "/admin/tournaments/" + otherId);
  await page.getByRole("heading", { name: "Тэмцээн олдсонгүй." }).waitFor();
  assert.deepEqual(errors,[]);
  await visitor.close();
  console.log("PASS: guest gate, owner dashboard, create/validate draft, events, teams, fixture validation, score editing, publish/public results, unpublish, other-owner guard, responsive layouts and accessibility. Supabase requests mocked.");
} catch(error) { console.error(await page.locator("main").innerText()); throw error; }
finally { await browser.close(); }
