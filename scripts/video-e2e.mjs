import { chromium } from "playwright";

const BASE = "http://127.0.0.1:8080";
const email = `video${Date.now()}@zunoza.test`;
const password = process.env.ZUNOZA_E2E_PASSWORD || "test-password";
const PROMPT = "Kapadokya’da şafak vakti balonların yükseldiği sakin bir manzara, yavaş kamera, 15 saniyelik dikey belgesel.";

async function signup() {
  const res = await fetch(`${BASE}/api/auth/sign-up/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: BASE },
    body: JSON.stringify({ email, password, name: "Video User" }),
  });
  const token = res.headers.get("set-auth-token");
  if (!res.ok || !token) throw new Error(`signup ${res.status}`);
  return token;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function dismissWelcome(page) {
  const cta = page.locator(".welcome-cta");
  try {
    await cta.waitFor({ state: "visible", timeout: 8000 });
    await cta.click({ force: true });
    await page.locator(".welcome-screen").waitFor({ state: "detached", timeout: 6000 });
  } catch {
    /* already gone */
  }
}

const token = await signup();
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.addInitScript((t) => {
  sessionStorage.setItem("grok-auth.bearer-token", t);
}, token);
page.setDefaultTimeout(20_000);

const report = {
  created: false,
  leftAndReturned: false,
  completed: false,
  failedShown: false,
  loadFailed: false,
  range206: false,
  jobId: "",
  status: "",
  errors: [],
};

page.on("pageerror", (err) => {
  const msg = String(err.message || err);
  if (/load failed/i.test(msg)) report.loadFailed = true;
  report.errors.push(msg);
});

try {
  await page.goto(`${BASE}/olustur`, { waitUntil: "domcontentloaded" });
  const start = page.getByRole("button", { name: "Başlayalım" });
  if (await start.count()) {
    await start.click({ force: true });
    await page.locator(".welcome-screen").waitFor({ state: "detached", timeout: 8000 }).catch(() => {});
    await sleep(500);
  }
  if (!(await page.getByRole("heading", { name: /Metinden Video/ }).count())) {
    await page.goto(`${BASE}/olustur`, { waitUntil: "domcontentloaded" });
  }
  await page.getByRole("heading", { name: /Metinden Video/ }).waitFor({ timeout: 15_000 });
  await page.locator("textarea").first().fill(PROMPT);
  await page.evaluate(() => {
    const fifteen = [...document.querySelectorAll("button")].find((b) => (b.textContent || "").trim() === "15 saniye");
    fifteen?.click();
  });
  await sleep(400);
  const clicked = await page.evaluate(() => {
    const b = [...document.querySelectorAll("button")].find((x) => /Videoyu Oluştur/.test(x.textContent || ""));
    if (!b || b.disabled) return { ok: false, text: b?.textContent || "", disabled: Boolean(b?.disabled) };
    b.click();
    return { ok: true, text: b.textContent || "", disabled: b.disabled };
  });
  report.errors.push(`click:${JSON.stringify(clicked)}`);
  const nav = page.waitForURL(/\/videolarim\//, { timeout: 60_000 });
  const err = page.locator(".text-danger").waitFor({ timeout: 60_000 });
  await Promise.race([nav, err]).catch(() => {});
  report.errors.push(`after:${page.url()}`);
  report.errors.push(`danger:${(await page.locator(".text-danger").allInnerTexts()).join(" | ")}`);
  if (!/\/videolarim\//.test(page.url())) {
    throw new Error("create did not navigate");
  }
  report.jobId = /\/videolarim\/([^/?#]+)/.exec(page.url())?.[1] || "";
  report.created = Boolean(report.jobId);

  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.goto(`${BASE}/videolarim/${report.jobId}`, { waitUntil: "domcontentloaded" });
  await dismissWelcome(page);
  report.leftAndReturned = report.created && page.url().includes(report.jobId);

  for (let i = 0; i < 40; i++) {
    const body = await page.locator("body").innerText();
    if (/tamamlandı/i.test(body)) {
      report.completed = true;
      report.status = "tamamlandi";
      break;
    }
    if (/başarısız/i.test(body)) {
      report.failedShown = true;
      report.status = "basarisiz";
      break;
    }
    await sleep(3000);
  }

  if (report.jobId) {
    const res = await fetch(`${BASE}/api/videolar/${report.jobId}/indir`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Origin: BASE,
        Range: "bytes=0-1",
      },
    });
    report.range206 = res.status === 206 || (report.completed && res.status === 200);
    if (res.status === 401 || res.status === 404) report.range206 = false;
  }
} catch (err) {
  report.errors.push(err instanceof Error ? err.message : String(err));
} finally {
  await browser.close();
  console.log(JSON.stringify(report, null, 2));
}

if (!report.created || !report.leftAndReturned || report.loadFailed) process.exit(1);
if (!report.completed && !report.failedShown) process.exit(1);
