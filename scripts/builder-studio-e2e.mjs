import { writeFileSync } from "node:fs";
import { chromium } from "playwright";

const BASE = "http://127.0.0.1:8080";
const email = "zunoza.builder.e2e@zunoza.test";
const password = process.env.ZUNOZA_E2E_PASSWORD || "test-password";
const PROMPT =
  "Basit bir yapılacaklar listesi oluştur. Görev ekleme, tamamlandı işaretleme ve silme olsun.";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function decodeServerFn(url) {
  try {
    const part = url.split("/_serverFn/")[1]?.split("?")[0] || "";
    return Buffer.from(part.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
  } catch {
    return url.slice(0, 180);
  }
}

async function dismissWelcome(page) {
  const cta = page.locator(".welcome-cta");
  try {
    await cta.waitFor({ state: "visible", timeout: 2500 });
    await cta.click({ force: true });
    await page.locator(".welcome-screen").waitFor({ state: "hidden", timeout: 4000 });
  } catch {
    /* already gone */
  }
}

async function waitPreview(page, seconds = 150) {
  for (let i = 0; i < seconds / 2; i++) {
    if ((await page.locator("iframe[title='Uygulama önizlemesi']").count()) > 0) return true;
    const body = await page.locator("body").innerText();
    if (/Tekrar Dene|Oluşturma başarısız/i.test(body)) return false;
    await sleep(2000);
  }
  return (await page.locator("iframe[title='Uygulama önizlemesi']").count()) > 0;
}

async function authToken() {
  const signIn = await fetch(`${BASE}/api/auth/sign-in/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: BASE },
    body: JSON.stringify({ email, password }),
  });
  if (signIn.ok) return signIn.headers.get("set-auth-token");
  const signUp = await fetch(`${BASE}/api/auth/sign-up/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: BASE },
    body: JSON.stringify({ email, password, name: "Studio E2E" }),
  });
  if (!signUp.ok) throw new Error(`auth ${signUp.status} ${await signUp.text()}`);
  return signUp.headers.get("set-auth-token");
}

const report = {
  signup: false,
  home: false,
  emptyState: false,
  menuItems: false,
  created: false,
  preview: false,
  edited: false,
  reopened: false,
  renamed: false,
  duplicated: false,
  deleteConfirm: false,
  deleted: false,
  projectId: "",
  copyId: "",
  note: "",
  errors: [],
  console: [],
};

const token = await authToken();
report.signup = Boolean(token);

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await context.addInitScript((t) => {
  sessionStorage.setItem("grok-auth.bearer-token", t);
}, token);
const page = await context.newPage();
page.setDefaultTimeout(20_000);
page.on("pageerror", (err) => report.console.push(String(err.message || err)));

try {
  await page.goto(`${BASE}/insa-et`, { waitUntil: "domcontentloaded" });
  await dismissWelcome(page);
  await page.waitForSelector("textarea", { timeout: 20_000 });
  const homeText = await page.locator("body").innerText();
  report.home = /Ne inşa etmek istiyorsun|Oluştur/i.test(homeText);
  report.emptyState = /Henüz proje yok|Projelerim/i.test(homeText);
  await page.screenshot({ path: "/workspace/screenshots/insa-et-studio-home.png", fullPage: true });

  const existing = await page.locator(".builder-home-card").count();
  if (existing === 0) {
    await page.locator("textarea").first().fill(PROMPT);
    await page.getByRole("button", { name: /Oluştur/ }).click();
    await page.waitForFunction(() => /\/insa-et\/bp_/.test(location.pathname), { timeout: 25_000 });
    report.projectId = /\/insa-et\/([^/?#]+)/.exec(page.url())?.[1] || "";
    report.created = Boolean(report.projectId);
    report.preview = await waitPreview(page, 180);
    await page.screenshot({ path: "/workspace/screenshots/insa-et-studio-work.png" });
    const composer = page.locator(".builder-composer textarea");
    if (report.preview && (await composer.count())) {
      await composer.fill("Başlığı Görevlerim yap.");
      await page.getByRole("button", { name
... 