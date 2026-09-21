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
const email = `story30.${Date.now()}@zunoza.test`;
const password = process.env.ZUNOZA_E2E_PASSWORD || "test-password";
const prompt =
  "Kapadokya vadisinde gün batımı, sıcak peri bacaları, yavaşça yükselen bir sıcak hava balonu, sinematik gerçekçi belgesel, yazısız.";

const result = {
  signup: false,
  creditsBefore: null,
  creditsAfterCreate: null,
  creditsAfterDone: null,
  thirtySelected: false,
  twoJobs: false,
  scene1Duration: null,
  scene2Duration: null,
  scene1Status: null,
  scene2Status: null,
  totalSeconds: 0,
  creditDelta: null,
  videolarimTwo: false,
  storyboardVisible: false,
  continuity: false,
  r2OrPlayback: false,
  montageTransfer: false,
  montageClips: 0,
  noFakeMerge: false,
  error: null,
};

function creditFromText(text) {
  const m = text.match(/Krediniz:\s*(\d+)/);
  return m ? Number(m[1]) : null;
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
page.setDefaultTimeout(30000);

try {
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /Hesabınız yok mu/ }).click();
  await page.locator('input[autocomplete="name"]').fill("Story 30");
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole("button", { name: "Kayıt Ol" }).click();
  await page.waitForURL((u) => !u.pathname.includes("/login"), { timeout: 20000 });
  result.signup = true;
  result.creditsBefore = creditFromText(await page.locator("body").innerText());

  await page.goto(`${BASE}/olustur`, { waitUntil: "networkidle" });
  await page.locator("textarea").fill(prompt);
  await page.getByRole("button", { name: "30 saniye" }).click();
  result.thirtySelected = true;
  await page.getByRole("button", { name: /Videoyu Oluştur/ }).click();
  await page.waitForURL(/\/storyboard/, { timeout: 60000 });
  await page.waitForTimeout(1500);
  result.creditsAfterCreate = creditFromText(await page.locator("body").innerText());
  if (result.creditsBefore != null && result.creditsAfterCreate != null) {
    result.creditDelta = result.creditsBefore - result.creditsAfterCreate;
  }

  const deadline = Date.now() + 8 * 60 * 1000;
  let scenes = [];
  while (Date.now() < deadline) {
    await page.goto(`${BASE}/storyboard`, { waitUntil: "networkidle" });
    const body = await page.locator("body").innerText();
    result.storyboardVisible = /Üretilen storyboard/.test(body);
    result.noFakeMerge = /Montaj için hazır|Üretiliyor|Eksik/.test(body) && !/sahte birleşik/i.test(body);
    const sceneBlocks = await page.locator("text=/Sahne \\d+ · 15 sn/").all();
    if (sceneBlocks.length >= 2) {
      result.twoJobs = true;
      result.scene1Duration = 15;
      result.scene2Duration = 15;
      result.totalSeconds = 30;
    }
    const doneCount = (body.match(/Sahne \d+ · 15 sn · Tamamlandı/g) || []).length;
    const failCount = (body.match(/Sahne \d+ · 15 sn · Üretim başarısız/g) || []).length;
    if (doneCount >= 2) {
      result.scene1Status = "tamamlandi";
      result.scene2Status = "tamamlandi";
      break;
    }
    if (failCount >= 1 && Date.now() > deadline - 10000) {
      result.scene1Status = doneCount ? "tamamlandi" : "basarisiz";
      result.scene2Status = "basarisiz";
      break;
    }
    await page.waitForTimeout(8000);
  }

  result.continuity = /doğal devam|ikinci 15|açılış sahnesi/i.test(await page.locator("body").innerText());

  await page.goto(`${BASE}/videolarim`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);
  const vtext = await page.locator("body").innerText();
  const fifteen = (vtext.match(/15 sn/g) || []).length;
  result.videolarimTwo = fifteen >= 2;
  const videos = page.locator("video");
  const vcount = await videos.count();
  if (vcount >= 1) {
    const src = await videos.nth(0).getAttribute("src");
    result.r2OrPlayback = Boolean(src
... 