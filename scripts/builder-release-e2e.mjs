import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";
import { buildKindApp } from "../src/lib/zunoza/builder-blueprints.ts";
import { inferAppKind } from "../src/lib/zunoza/builder-architecture.ts";

const BASE = "http://127.0.0.1:8080";
const A = { email: "zunoza.release.a@zunoza.test", password: process.env.ZUNOZA_E2E_PASSWORD || "test-password", name: "Release A" };
const B = { email: "zunoza.release.b@zunoza.test", password: process.env.ZUNOZA_E2E_PASSWORD || "test-password", name: "Release B" };
const PROMPT = "Basit bir yapılacaklar listesi oluştur. Görev ekleme, tamamlandı işaretleme ve silme olsun.";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function authToken(user) {
  const signIn = await fetch(`${BASE}/api/auth/sign-in/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: BASE },
    body: JSON.stringify({ email: user.email, password: user.password }),
  });
  if (signIn.ok) return signIn.headers.get("set-auth-token");
  const signUp = await fetch(`${BASE}/api/auth/sign-up/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: BASE },
    body: JSON.stringify({ email: user.email, password: user.password, name: user.name }),
  });
  if (!signUp.ok) throw new Error(`auth ${signUp.status} ${await signUp.text()}`);
  return signUp.headers.get("set-auth-token");
}

async function dismissWelcome(page) {
  const cta = page.locator(".welcome-cta");
  try {
    await cta.waitFor({ state: "visible", timeout: 8000 });
    await cta.click({ force: true });
    await page.locator(".welcome-screen").waitFor({ state: "hidden", timeout: 6000 });
  } catch {
    /* already gone */
  }
}

async function waitPreview(page, seconds = 180) {
  for (let i = 0; i < seconds / 2; i++) {
    if ((await page.locator("iframe[title='Uygulama önizlemesi']").count()) > 0) return true;
    const body = await page.locator("body").innerText();
    if (/Tekrar Dene|Oluşturma başarısız|Proje yüklenemedi/i.test(body)) return false;
    await sleep(2000);
  }
  return (await page.locator("iframe[title='Uygulama önizlemesi']").count()) > 0;
}

async function openAuthed(context, path = "/insa-et") {
  const page = await context.newPage();
  page.setDefaultTimeout(20_000);
  await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
  await dismissWelcome(page);
  return page;
}

const tests = {};
function mark(name, ok, note = "") {
  tests[name] = { result: ok ? "PASS" : "FAIL", note };
}

mkdirSync("/workspace/screenshots", { recursive: true });
const consoleErrors = [];
const pageErrors = [];

const tokenA = await authToken(A);
const tokenB = await authToken(B);
mark("auth_two_users", Boolean(tokenA && tokenB));

const browser = await chromium.launch({ headless: true });
const ctxA = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctxA.addInitScript((t) => sessionStorage.setItem("grok-auth.bearer-token", t), tokenA);
const ctxB = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctxB.addInitScript((t) => sessionStorage.setItem("grok-auth.bearer-token", t), tokenB);

const page = await openAuthed(ctxA);
page.on("pageerror", (err) => pageErrors.push(String(err.message || err)));
page.on("console", (msg) => {
  if (msg.type() === "error") consoleErrors.push(msg.text());
});

try {
  await page.waitForSelector("textarea", { timeout: 20_000, state: "attached" });
  await dismissWelcome(page);
  await page.locator("textarea").first().waitFor({ state: "visible", timeout: 15_000 });
  const homeText = await page.locator("body").innerText();
  mark("home", /Bugün ne inşa etmek istiyorsunuz|Oluştur/i.test(homeText));
  mark("categories", /Web sitesi/.test(homeText) && /E-ticaret/.test(homeText) && /SaaS/.test(homeText));
  await page.screenshot({ path: "/workspace/screenshots/insa-et-release-home.png", fullPage: true });

  for (const [name, size] of [
    ["phone", { width: 390, height: 844 }],
    ["tablet", { width: 768, height: 1024 }],
    ["desktop", { width: 1440, height: 900 }],
  ]) {
    await page.setViewportSize(size);
    await sleep(400);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window
... 