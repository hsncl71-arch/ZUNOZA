import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

const BASE = "http://127.0.0.1:8080";
const email = `photo.i2v.${Date.now()}@zunoza.test`;
const password = process.env.ZUNOZA_E2E_PASSWORD || "test-password";
const PROMPT =
  "Sabit duran kırmızı bir fincan, yavaş yaklaşan kamera, gün batımı ışığı, sessiz belgesel.";

const IMAGE = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function leak(text) {
  return /Grok Imagine|Imagine’a gönderiliyor|Imagine'a gönderiliyor|\bKling\b|\bShotstack\b|\bElevenLabs\b|grok-imagine/i.test(
    text,
  );
}

async function signup() {
  const res = await fetch(`${BASE}/api/auth/sign-up/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: BASE },
    body: JSON.stringify({ email, password, name: "Photo I2V" }),
  });
  const token = res.headers.get("set-auth-token");
  if (!res.ok || !token) throw new Error(`signup ${res.status} ${await res.text()}`);
  return token;
}

async function killWelcome(page) {
  const start = page.getByRole("button", { name: "Başlayalım" });
  if (await start.count()) {
    await start.click({ force: true }).catch(() => {});
    await page.locator(".welcome-screen").waitFor({ state: "detached", timeout: 8000 }).catch(() => {});
  }
  await page.evaluate(() => document.querySelector(".welcome-screen")?.remove());
  await sleep(300);
}

mkdirSync("/workspace/screenshots", { recursive: true });

const report = {
  signup: false,
  photoTitle: false,
  uploaded: false,
  noProviderNames: false,
  noStuckPercent: false,
  waitHint: false,
  stagesPresent: false,
  created: false,
  jobStages: false,
  completed: false,
  preview: false,
  download: false,
  jobId: "",
  status: "",
  notes: [],
  errors: [],
};

const token = await signup();
report.signup = Boolean(token);

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.addInitScript((t) => sessionStorage.setItem("grok-auth.bearer-token", t), token);
page.setDefaultTimeout(25_000);
page.on("pageerror", (err) => report.errors.push(String(err.message || err)));

try {
  await page.goto(`${BASE}/olustur`, { waitUntil: "domcontentloaded" });
  await killWelcome(page);
  if (!(await page.getByRole("heading", { name: /Metinden Video|Fotoğraftan Video/ }).count())) {
    await page.goto(`${BASE}/olustur`, { waitUntil: "domcontentloaded" });
    await killWelcome(page);
  }
  await page.getByRole("heading", { name: /Metinden Video|Fotoğraftan Video/ }).waitFor({ timeout: 15_000 });
  await page.getByRole("button", { name: /^Görselden$/ }).click({ force: true });
  await page.getByText("Fotoğraftan Video — AI Video").waitFor({ timeout: 10_000 });
  report.photoTitle = true;

  await page.locator('input[type="file"]').first().setInputFiles({
    name: "fincan.png",
    mimeType: "image/png",
    buffer: IMAGE,
  });
  await page.locator('img[alt="Yüklenen görsel önizlemesi"]').waitFor({ timeout: 10_000 });
  report.uploaded = true;
  await page.locator("textarea").first().fill(PROMPT);
  await sleep(1000);
  await page.screenshot({ path: "/workspace/screenshots/photo-video-form.png", fullPage: true });

  const formText = await page.locator("body").innerText();
  report.noProviderNames = !leak(formText);
  report.noStuckPercent = !/\b33%\b/.test(formText) && !/null%/.test(formText);
  if (!report.noProviderNames) report.notes.push("form leak: " + formText.slice(0, 500));

  const createBtn = page.getByRole("button", { name: /Videoyu Oluştur/ });
  await createBtn.waitFor({ timeout: 15_000 });
  if (await page.getByRole("button", { name: /Kredi Satın Al/ }).count()) {
    throw new Error("photo-to-video still blocked by credits
... 