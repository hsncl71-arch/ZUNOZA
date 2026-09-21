import { chromium } from "playwright";
import { writeFileSync } from "node:fs";

if (!process.env.ZUNOZA_ALLOW_TEST_SIGNUP) {
  console.log(
    JSON.stringify({
      skipped: true,
      reason: "Test kaydı kapalı. Gerçek kullanıcı oluşturulmaz.",
    }),
  );
  process.exit(0);
}

const BASE = "http://127.0.0.1:8080";
const email = `montaj.${Date.now()}@zunoza.test`;
const password = process.env.ZUNOZA_E2E_PASSWORD || "test-password";

const result = {
  signup: false,
  studioPage: false,
  navVisible: false,
  timeline: false,
  twoClips: false,
  reorder: false,
  ttsAttach: false,
  storyboardTransfer: false,
  shotstackReady: false,
  renderAttempted: false,
  renderDone: false,
  playback: false,
  download: false,
  r2Stored: false,
  saveReopen: false,
  honestNoFake: false,
  error: null,
};

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
page.setDefaultTimeout(30000);

async function signup() {
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /Hesabınız yok mu/ }).click();
  await page.locator('input[autocomplete="name"]').fill("Montaj Test");
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole("button", { name: "Kayıt Ol" }).click();
  await page.waitForURL((u) => !u.pathname.includes("/login"), { timeout: 20000 });
}

async function generateTts() {
  await page.goto(`${BASE}/seslendirme`, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "Seslendirme Stüdyosu" }).waitFor();
  await page.waitForFunction(
    () => [...document.querySelectorAll("button")].some((b) => /Eve|Enerjik/i.test(b.textContent || "")),
    { timeout: 20000 },
  );
  await page.locator("textarea").fill("ZUNOZA montaj stüdyosu için Türkçe seslendirme testi.");
  const eve = page.getByRole("button", { name: /Eve/ }).first();
  if (await eve.count()) await eve.click();
  await page.getByRole("button", { name: "Seslendir" }).click();
  await page.locator("text=Dinle").first().waitFor({ timeout: 90000 });
}

async function generateImage(prompt) {
  await page.goto(`${BASE}/gorsel`, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: /Görsel/ }).waitFor();
  await page.locator("textarea").fill(prompt);
  await page.getByRole("button", { name: /Görsel Üret/ }).click();
  await Promise.race([
    page.locator("img").nth(1).waitFor({ timeout: 120000 }),
    page.getByText(/üretildi|kaydedildi/i).waitFor({ timeout: 120000 }),
  ]);
}

try {
  await signup();
  result.signup = true;

  await generateTts();
  try {
    await generateImage("Kapadokya üzerinde gün batımı, sinematik dron görüntüsü, yazısız.");
  } catch (e) {
    result.error = "image:" + String(e?.message || e);
  }

  await page.goto(`${BASE}/montaj`, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "Montaj Stüdyosu" }).waitFor();
  result.studioPage = true;
  result.navVisible = (await page.getByRole("link", { name: /^Montaj$/ }).count()) > 0;
  const body = await page.locator("body").innerText();
  result.shotstackReady = /Montaj birleştirmesi hazır/.test(body) && !/bağlı değil/.test(body);
  result.honestNoFake = /sahte birleşik MP4 üretilmez|bağlı değil/i.test(body) || result.shotstackReady;

  const listError = await page.locator("p.text-danger").innerText().catch(() => "");
  await page.getByRole("button", { name: "Yeni montaj projesi" }).click();
  try {
    await page.waitForURL(/\/montaj\//, { timeout: 20000 });
  } catch (e) {
    const errText = await page.locator("p.text-danger").innerText().catch(() => "");
    throw new Error(`create-nav list=${listError} err=${errText} url=${page.url()} ${e?.message || e}`);
  }
  await page.getByRole("heading", { name: "Zaman çizelgesi" }).waitFor();
  result.timeline = true;

  await page.getByRole("button", { name: "Görsel ekle" }).click();
  const imageButtons = page.locator("section button.block");
  await imageButtons.first().waitFor({ timeout: 15000 }).catch(() => {});
  const imgCount = await imageButtons.count();
  if (imgCount >= 1) {
    await imageButtons.nth(0).click();
    await page.getByText(/klip/).first().waitFor({ timeout:
... 