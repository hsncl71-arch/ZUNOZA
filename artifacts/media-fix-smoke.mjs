import { chromium } from "playwright";
import { writeFileSync, mkdirSync } from "node:fs";

const origin = "http://127.0.0.1:8080";
mkdirSync("/workspace/screenshots", { recursive: true });

const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

const viewports = [
  { name: "desktop", width: 1280, height: 800 },
  { name: "mobile", width: 390, height: 844 },
];

const report = [];

for (const vp of viewports) {
  const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
  const errors = [];
  page.on("pageerror", (err) => errors.push(String(err.message || err)));

  await page.goto(origin + "/", { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForTimeout(1200);
  const homeText = await page.locator("body").innerText();
  const tabs = await page.locator("nav a.tab-link").allTextContents();
  await page.screenshot({ path: `/workspace/screenshots/fix-media-${vp.name}-home.png`, fullPage: false });

  await page.locator('header button[aria-label="Menü"]').click();
  await page.waitForTimeout(400);
  const menuText = await page.locator(".drawer-panel").innerText().catch(() => "");
  await page.screenshot({ path: `/workspace/screenshots/fix-media-${vp.name}-menu.png`, fullPage: false });
  await page.keyboard.press("Escape");

  const paths = ["/montaj", "/olustur", "/storyboard", "/muzik", "/seslendirme", "/gorsel", "/videolarim"];
  const pages = {};
  for (const path of paths) {
    await page.goto(origin + path, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(700);
    const text = await page.locator("body").innerText();
    pages[path] = {
      gated: /giriş yap|google|hesabınız/i.test(text),
      hasMontaj: /Montaj/i.test(text),
      hasVideoUretmez: /video üretmez/i.test(text),
      hasUploadCopy: /telefondan veya bilgisayardan/i.test(text),
      hasEnstruman: /enstrümantal|sözlü vokal/i.test(text),
      snippet: text.replace(/\s+/g, " ").slice(0, 220),
    };
  }
  await page.screenshot({ path: `/workspace/screenshots/fix-media-${vp.name}-montaj-gate.png`, fullPage: false });

  report.push({
    viewport: vp.name,
    homeHasMontajCard: /Montaj Stüdyosu/.test(homeText),
    homeHasPhoneCopy: /Kendi videolarını birleştir/.test(homeText),
    tabs,
    tabHasMontaj: tabs.some((t) => /Montaj/i.test(t)),
    menuHasMontaj: /Montaj Stüdyosu/.test(menuText),
    pages,
    pageErrors: errors,
  });
  await page.close();
}

await browser.close();
writeFileSync("/workspace/artifacts/media-fix-smoke.json", JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
