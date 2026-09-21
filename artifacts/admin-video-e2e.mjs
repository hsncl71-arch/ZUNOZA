import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";

const BASE = "http://127.0.0.1:8080";
const email = "zunoza.e2e.admin@zunoza.test";
const password = process.env.ZUNOZA_E2E_PASSWORD || "test-password";
const PROMPT = "Sabit kırmızı fincan, yavaş yaklaşan kamera, gün batımı ışığı, sessiz belgesel.";

function crc32(buf) {
  let c = ~0;
  for (const b of buf) {
    c ^= b;
    for (let i = 0; i < 8; i++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(tag, data) {
  const t = Buffer.from(tag);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([t, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function makePng(width, height, rgb) {
  const raw = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y++) {
    const row = y * (width * 3 + 1);
    raw[row] = 0;
    for (let x = 0; x < width; x++) {
      const i = row + 1 + x * 3;
      raw[i] = rgb[0];
      raw[i + 1] = rgb[1];
      raw[i + 2] = rgb[2];
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const PNG = makePng(640, 360, [196, 42, 32]);

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
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
    body: JSON.stringify({ email, password, name: "E2E Admin" }),
  });
  if (!signUp.ok) throw new Error(`auth ${signUp.status} ${await signUp.text()}`);
  return signUp.headers.get("set-auth-token");
}

async function dismissWelcome(page) {
  const cta = page.getByRole("button", { name: "Başlayalım" });
  if (await cta.count()) await cta.click({ force: true }).catch(() => {});
  await page.evaluate(() => document.querySelector(".welcome-screen")?.remove());
}

const report = {
  signup: false,
  unlimited: false,
  photoCreated: false,
  photoCompleted: false,
  photoPreview: false,
  textCreated: false,
  textCompleted: false,
  noGrokImagine: true,
  noStuck33: true,
  stages: false,
  jobId: "",
  errors: [],
};

function leak(text) {
  return /Grok Imagine|Kling bağlı|Imagine’a gönderiliyor|Imagine'a gönderiliyor/i.test(String(text || ""));
}

try {
  const token = await authToken();
  report.signup = Boolean(token);
  mkdirSync("/workspace/screenshots", { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.addInitScript((t) => sessionStorage.setItem("grok-auth.bearer-token", t), token);
  page.setDefaultTimeout(25_000);

  await page.goto(`${BASE}/olustur`, { waitUntil: "domcontentloaded" });
  await dismissWelcome(page);
  await page.goto(`${BASE}/olustur`, { waitUntil: "domcontentloaded" });
  await dismissWelcome(page);
  await page.getByRole("heading", { name: /Metinden Video|Fotoğraftan Video/ }).waitFor({ timeout: 20_000 });

  const unlimitedCopy = page.getByText(/kredi düşmez/);
  await unlimitedCopy.waitFor({ timeout: 20_000 }).catch(() => {});
  report.unlimited = (await unlimitedCopy.count()) > 0;
  if (!report.unlimited) {
    const body = await page.locator("body").innerText();
    report.errors.push(`unlimited copy missing: ${body.slice(0, 400)}`);
  }

  await page.getByRole("button", { name: /^Görselden$/ }).click({ force: true });
 mar  await page.getByRole("heading", { name
... 