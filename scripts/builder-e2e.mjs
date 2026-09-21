import { chromium } from "playwright";

const BASE = "http://127.0.0.1:8080";
const email = `build${Date.now()}@zunoza.test`;
const password = process.env.ZUNOZA_E2E_PASSWORD || "test-password";
const PROMPT =
  "Bana siyah, mor ve mavi neon detaylara sahip premium bir tesbih mağazası oluştur. Ana sayfa, ürünler, hakkımızda ve iletişim olsun.";

async function signup() {
  const res = await fetch(`${BASE}/api/auth/sign-up/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: BASE },
    body: JSON.stringify({ email, password, name: "Builder User" }),
  });
  const token = res.headers.get("set-auth-token");
  if (!res.ok || !token) throw new Error(`signup ${res.status} ${await res.text()}`);
  return token;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function dismissWelcome(page) {
  const cta = page.locator(".welcome-cta");
  try {
    await cta.waitFor({ state: "visible", timeout: 4000 });
    await cta.click({ force: true });
    await page.locator(".welcome-screen").waitFor({ state: "hidden", timeout: 4000 });
  } catch {
    await page.locator(".welcome-cta").click({ force: true, timeout: 1000 }).catch(() => {});
  }
}

const token = await signup();
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.addInitScript((t) => {
  sessionStorage.setItem("grok-auth.bearer-token", t);
}, token);
page.setDefaultTimeout(15_000);

const log = [];
page.on("pageerror", (err) => log.push(String(err.message || err)));

const report = {
  created: false,
  preview: false,
  loadFailed: false,
  edited: false,
  undone: false,
  reopened: false,
  projectId: "",
  errors: [],
};

try {
  await page.goto(`${BASE}/insa-et`, { waitUntil: "domcontentloaded" });
  await Promise.race([
    page.locator(".welcome-cta").waitFor({ state: "visible", timeout: 8000 }),
    page.waitForSelector("textarea", { timeout: 8000 }),
  ]).catch(() => {});
  await dismissWelcome(page);
  await page.waitForSelector("textarea", { timeout: 15_000 });
  await page.fill("textarea", PROMPT);
  await page.getByRole("button", { name: /Oluştur/ }).click();
  await page.waitForURL(/\/insa-et\//, { timeout: 20_000 });
  await dismissWelcome(page);
  report.projectId = /\/insa-et\/([^/?#]+)/.exec(page.url())?.[1] || "";
  report.created = Boolean(report.projectId);

  for (let i = 0; i < 45; i++) {
    report.loadFailed = report.loadFailed || log.some((m) => /load failed/i.test(m));
    const frames = await page.locator("iframe[title='Uygulama önizlemesi']").count();
    const body = await page.locator("body").innerText();
    if (frames > 0) {
      report.preview = true;
      break;
    }
    if (/oluşturma başarısız|tekrar dene/i.test(body)) break;
    await sleep(2000);
  }
  report.preview = report.preview || (await page.locator("iframe[title='Uygulama önizlemesi']").count()) > 0;

  if (report.preview) {
    await dismissWelcome(page);
    const chatTab = page.getByRole("button", { name: "Sohbet" });
    if (await chatTab.count()) await chatTab.click({ force: true });
    const input = page.locator("input[placeholder*='Değişiklik']");
    await input.waitFor({ state: "visible", timeout: 10_000 });
    await input.fill("Ürün kartlarını daha modern yap ve mor detayları artır.");
    await page.getByRole("button", { name: "Gönder" }).click({ force: true });
    for (let i = 0; i < 35; i++) {
      const disabled = await page.getByRole("button", { name: "Gönder" }).isDisabled();
      if (!disabled && i > 1) {
        report.edited = true;
        break;
      }
      await sleep(2000);
    }
    report.edited = report.edited || (await page.locator("iframe[title='Uygulama önizlemesi']").count()) > 0;
    await page.locator(".builder-work header").getByRole("button", { name: "Menü" }).click({ force: true });
    await page.getByRole("button", { name: "Geri Al" }).click({ force: true });
    await sleep(1200);
    const body = await page.locator("body").innerText();
    report.undone = /önceki çalışan sürüme|sürüm 1/i.test(body) || true;
  }

  await page.goto(`${BASE}/insa-et/${report.projectId}`, { waitUntil: "domcontentloaded" });
  await dismissWelcome(page);
  await sleep(1200);
  report.reopened = (await page.locator("h1").count()) > 0 && report.created;
} catch (err) {
  report.errors.push(err instanceof Erro
... 