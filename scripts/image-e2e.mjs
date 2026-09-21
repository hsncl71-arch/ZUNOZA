import { chromium } from "playwright";

const BASE = "http://127.0.0.1:8080";
const email = `img${Date.now()}@zunoza.test`;
const password = process.env.ZUNOZA_E2E_PASSWORD || "test-password";

const unauth = await fetch(`${BASE}/api/gorseller/not-a-real-id/indir`);
const builderUnauth = await fetch(`${BASE}/api/builder-assets/not-a-real-id/indir`);

const signup = await fetch(`${BASE}/api/auth/sign-up/email`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Origin: BASE },
  body: JSON.stringify({ email, password, name: "Image User" }),
});
const token = signup.headers.get("set-auth-token");
if (!signup.ok || !token) throw new Error(`signup ${signup.status}`);

const other = await fetch(`${BASE}/api/gorseller/not-a-real-id/indir`, {
  headers: { Authorization: `Bearer ${token}` },
});

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.addInitScript((t) => sessionStorage.setItem("grok-auth.bearer-token", t), token);
await page.goto(`${BASE}/gorsel`, { waitUntil: "domcontentloaded" });
await page.getByRole("button", { name: "Başlayalım" }).click({ force: true }).catch(() => {});
await page.locator(".welcome-screen").waitFor({ state: "detached", timeout: 6000 }).catch(() => {});
if (!(await page.getByRole("heading", { name: /Yapay Zekâ ile Görsel/ }).count())) {
  await page.goto(`${BASE}/gorsel`, { waitUntil: "domcontentloaded" });
}
await page.getByRole("heading", { name: /Yapay Zekâ ile Görsel/ }).waitFor({ timeout: 15_000 }).catch(() => {});
const body = await page.locator("body").innerText();
await browser.close();

const report = {
  unauth401: unauth.status === 401,
  builderUnauth401: builderUnauth.status === 401,
  missing404: other.status === 404 || other.status === 401,
  hasUpload: body.includes("Kaynak fotoğraf"),
  hasLibrary: body.includes("Görsellerim"),
  hasRefs: body.includes("Referans görseller"),
  has9x16: body.includes("9:16"),
};
console.log(JSON.stringify(report, null, 2));
if (!report.unauth401 || !report.builderUnauth401 || !report.hasUpload || !report.hasLibrary) process.exit(1);
