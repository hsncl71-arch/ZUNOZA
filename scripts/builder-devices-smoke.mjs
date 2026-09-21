import { chromium } from "playwright";
import { writeFileSync, mkdirSync } from "node:fs";

const BASE = process.env.SMOKE_BASE || "http://127.0.0.1:8080";
const PROMPT =
  "Modern ve premium görünümlü basit bir yapılacaklar uygulaması oluştur. Görev ekleme, düzenleme, tamamlandı işaretleme ve silme çalışsın. Mobil ve masaüstü uyumlu olsun.";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function signup() {
  const email = `build${Date.now()}@zunoza.test`;
  const res = await fetch(`${BASE}/api/auth/sign-up/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: BASE },
    body: JSON.stringify({ email, password: process.env.ZUNOZA_E2E_PASSWORD || "test-password", name: "Hasan Ocal" }),
  });
  const token = res.headers.get("set-auth-token");
  if (!res.ok || !token) throw new Error(`signup ${res.status} ${await res.text()}`);
  return token;
}

async function landOnBuilder(page) {
  await page.goto(`${BASE}/insa-et`, { waitUntil: "domcontentloaded" });
  const welcome = page.locator(".welcome-screen");
  if (await welcome.count()) {
    await page.locator(".welcome-cta").click({ force: true }).catch(() => {});
    await welcome.waitFor({ state: "hidden", timeout: 5000 }).catch(() => {});
  }
  if (!page.url().includes("/insa-et")) {
    await page.goto(`${BASE}/insa-et`, { waitUntil: "domcontentloaded" });
  }
  await page.locator("textarea").waitFor({ state: "visible", timeout: 15_000 });
}

const report = {
  startDesktop: false,
  startTablet: false,
  startPhone: false,
  created: false,
  agentUi: false,
  noCrash: true,
  noInfinitePreview: true,
  preview: false,
  devicePhone: false,
  deviceTablet: false,
  deviceDesktop: false,
  add: false,
  edit: false,
  complete: false,
  remove: false,
  errors: [],
};

const errors = [];
mkdirSync("/tmp/builder-smoke", { recursive: true });

const browser = await chromium.launch({ headless: true });
try {
  const token = await signup();
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await context.addInitScript((t) => {
    sessionStorage.setItem("grok-auth.bearer-token", t);
  }, token);
  const page = await context.newPage();
  page.on("pageerror", (err) => {
    const msg = String(err.message || err);
    errors.push(msg);
    if (/report\.tests\.filter|undefined is not an object/i.test(msg)) report.noCrash = false;
  });

  async function shot(name, width, height) {
    await page.setViewportSize({ width, height });
    try {
      await landOnBuilder(page);
    } catch {
      errors.push(`${name} url=${page.url()} body=${(await page.locator("body").innerText()).slice(0, 180)}`);
      await page.screenshot({ path: `/tmp/builder-smoke/${name}-fail.png`, fullPage: true });
      return false;
    }
    const body = await page.locator("body").innerText();
    const ok = /Oluştur/i.test(body) && /Ne inşa etmek istiyorsun/i.test(body);
    await page.screenshot({ path: `/tmp/builder-smoke/${name}.png`, fullPage: true });
    return ok;
  }

  report.startDesktop = await shot("desktop", 1280, 800);
  report.startTablet = await shot("tablet", 768, 1024);
  report.startPhone = await shot("phone", 390, 844);

  await page.setViewportSize({ width: 390, height: 844 });
  const welcome = page.locator(".welcome-screen");
  if (await welcome.count()) {
    await page.locator(".welcome-cta").click({ force: true }).catch(() => {});
    await welcome.waitFor({ state: "hidden", timeout: 5000 }).catch(() => {});
  }
  if (!page.url().includes("/insa-et") || !(await page.locator("textarea").isVisible().catch(() => false))) {
    await landOnBuilder(page);
  }
  await page.locator("textarea").fill(PROMPT);
  const typed = await page.locator("textarea").inputValue();
  const createBtn = page.locator("button.w-full.min-h-12");
  const disabled = await createBtn.isDisabled();
  const label = await createBtn.innerText();
  if (typed.length < 8 || disabled) {
    errors.push(`fill typed=${typed.length} disabled=${disabled} label=${label}`);
  }
  await createBtn.click({ force: true });
  await page.evaluate(() => {
    const btn = document.querySelector("button.w-full.min-h-12");
    if (btn instanceof HTMLButtonElement) btn.click();
  });
  await sleep(2500);
  try {
    await Promise.race([
      page.waitForURL(/\/insa-et\/[^/?#]+/, { timeout: 25_000 }),
      page.locator("p.text-sm.text-danger").waitFor({ state: "visible", timeout: 25_000 }),
    ]);
  } catch {
    errors.push(`create url=${page.url()} body=${(await page.locator("body").innerText()).slice(0, 240)}`);
  }
  report.created = /\/insa-et\/[^/?#]+/.test(page.url());
  if (!report.created) {
    errors.push(`not-created url=${page.url()} body=${(await page.locator("body").innerText()).slice(0, 240)}`);
    await page.screenshot({ path: "/tmp/builder-smoke/create-fail.png" });
  } else {
  for (let i = 0; i < 70; i++) {
    const body = await page.locator("body").innerText();
    if (/Ajan çalışıyor|İstek analiz|Kod oluşturuluyor|Uygulama planlanıyor/i.test(body)) report.agentUi = true;
    if (/Çalışan önizleme hazırlanıyor/i.test(body)) report.noInfinitePreview = false;
    const frames = await page.locator("iframe[title='Uygulama önizlemesi']").count();
    if (frames > 0) {
      report.preview = true;
      break;
    }
    if (/oluşturma başarısız|yeterli krediniz|inşa limiti/i.test(body) && i > 4) {
      errors.push(body.slice(0, 240));
      break;
    }
    await sleep(3000);
  }
  if (!report.preview) {
    await page.getByRole("button", { name: "Önizleme" }).click({ force: true }).catch(() => {});
    await page.getByRole("button", { name: "Önizle" }).click({ force: true }).catch(() => {});
    await sleep(1000);
    report.preview = (await page.locator("iframe[title='Uygulama önizlemesi']").count()) > 0;
    if (!report.preview) {
      errors.push(`no-preview body=${(await page.locator("body").innerText()).slice(0, 280)}`);
      await page.screenshot({ path: "/tmp/builder-smoke/no-preview.png" });
    }
  }

  if (report.preview) {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.getByRole("button", { name: "Önizleme" }).click({ force: true }).catch(() => {});
    await page.getByRole("button", { name: "Önizle" }).click({ force: true }).catch(() => {});
    await sleep(800);
    const phoneBtn = page.getByRole("button", { name: "Telefon" });
    const tabletBtn = page.getByRole("button", { name: "Tablet" });
    const deskBtn = page.getByRole("button", { name: "Masaüstü" });
    if (await phoneBtn.count()) {
      a
... 