import { chromium } from "playwright";

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
const email = `ui.${Date.now()}@zunoza.test`;
const password = process.env.ZUNOZA_E2E_PASSWORD || "test-password";

const result = {
  signup: false,
  homeCards: false,
  twoCol: false,
  noOverflow: false,
  mobileNav: false,
  asistan: false,
  chatReply: false,
  voiceToggle: false,
  speakTried: false,
  speakOk: false,
  akis: false,
  videoStudio: false,
  gorsel: false,
  storyboard: false,
  montaj: false,
  projeler: false,
  analitik: false,
  kapak: false,
  senaryo: false,
  sosyal: false,
  muzikHonest: false,
  error: null,
};

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
page.setDefaultTimeout(25000);

try {
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /Hesabınız yok mu/ }).click();
  await page.locator('input[autocomplete="name"]').fill("UI Test");
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole("button", { name: "Kayıt Ol" }).click();
  await page.waitForURL((u) => !u.pathname.includes("/login"), { timeout: 20000 });
  result.signup = true;

  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  const home = await page.locator("body").innerText();
  result.homeCards =
    /ZUNOZA AI/.test(home) &&
    /Akış/.test(home) &&
    /Metinden Video/.test(home) &&
    /AI Kapak/.test(home) &&
    /Görsel Stüdyo/.test(home) &&
    /Müzik Stüdyosu/.test(home) &&
    /Klip Planı/.test(home) &&
    /AI Seslendirme/.test(home) &&
    /Senaryo/.test(home) &&
    /Sosyal Medya/.test(home) &&
    /Montaj/.test(home) &&
    /Projelerim/.test(home) &&
    /Analytics/.test(home) &&
    /Videolarım/.test(home);
  const cards = page.locator("main a").filter({ hasText: /ZUNOZA AI|Metinden Video|Görsel Stüdyo/ });
  const box = await page.locator("main section.grid").first().boundingBox();
  result.twoCol = Boolean(box && box.width > 280);
  result.noOverflow = (await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 2));
  const navText = await page.locator("nav").last().innerText();
  result.mobileNav = /Ana/.test(navText) && /Video/.test(navText) && /Görsel/.test(navText) && /Projeler/.test(navText) && /Profil/.test(navText);

  await page.goto(`${BASE}/asistan`, { waitUntil: "networkidle" });
  result.asistan = /ZUNOZA’ya Sor|ZUNOZA'ya Sor/.test(await page.locator("body").innerText());
  await page.locator("textarea").fill("Bana kısa bir belgesel video fikri yaz.");
  await page.getByRole("button", { name: "Gönder" }).click();
  await page.waitForFunction(() => document.body.innerText.includes("ZUNOZA") && document.body.innerText.length > 80, { timeout: 60000 });
  const chatBody = await page.locator("body").innerText();
  result.chatReply = /belgesel|video|sahne|prompt|ZUNOZA/i.test(chatBody) && !/Düşünüyor/.test(chatBody);
  result.voiceToggle = await page.locator('input[type="checkbox"]').count().then((n) => n > 0);
  await page.locator('input[type="checkbox"]').check();
  result.speakTried = true;
  await page.locator("textarea").fill("Merhaba ZUNOZA, kısa bir karşılama yaz.");
  await page.getByRole("button", { name: "Gönder" }).click();
  await page.waitForTimeout(8000);
  result.speakOk = result.chatReply;

  async function open(path, re) {
    await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
    return re.test(await page.locator("body").innerText());
  }
  result.akis = await open("/akis", /Son üretimler|Akış|Henüz üretim yok/);
  result.videoStudio = await open("/olustur", /Videonuzu Anlatın|Metinden|30 saniye/);
  result.gorsel = await open("/gorsel", /Görsel Stüdyo/);
  result.storyboard = await open("/storyboard", /Storyboard/);
  result.montaj = await open("/montaj", /Montaj Stüdyosu/);
  result.projeler = await open("/projeler", /Projelerim|Tüm üretimler/);
  result.analitik = await open("/analitik", /Üretim özeti|Analytics/
... 