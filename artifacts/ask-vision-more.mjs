import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";

const apiKey = process.env.XAI_API_KEY?.trim();
if (!apiKey) {
  console.log("SKIP: XAI_API_KEY missing");
  process.exit(2);
}

mkdirSync("/tmp/zunoza-vision", { recursive: true });

function makeJpeg(path, script) {
  const py = spawnSync("python3", ["-c", script], { encoding: "utf8" });
  if (py.status !== 0) throw new Error(py.stderr || py.stdout || "pil fail");
  return `data:image/jpeg;base64,${readFileSync(path).toString("base64")}`;
}

async function ask(messages, model = "grok-4-fast-non-reasoning") {
  const res = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, temperature: 0.1, max_tokens: 220, messages }),
    signal: AbortSignal.timeout(40_000),
  });
  const json = await res.json().catch(() => ({}));
  return {
    status: res.status,
    text: json?.choices?.[0]?.message?.content || "",
    error: json?.error?.message || json?.message || "",
  };
}

const errPath = "/tmp/zunoza-vision/error.jpg";
const errorUrl = makeJpeg(
  errPath,
  `
from PIL import Image, ImageDraw, ImageFont
im = Image.new("RGB", (720, 280), (20, 20, 28))
d = ImageDraw.Draw(im)
try:
    font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 28)
    small = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 20)
except Exception:
    font = ImageFont.load_default(); small = font
d.rectangle([16, 16, 704, 264], outline=(220, 70, 70), width=4)
d.text((36, 40), "Application Error", fill=(255, 90, 90), font=font)
d.text((36, 100), "NET::ERR_CERT_DATE_INVALID", fill=(240, 240, 240), font=small)
d.text((36, 150), "Safari could not open the page.", fill=(200, 200, 210), font=small)
im.save(${JSON.stringify(errPath)}, "JPEG", quality=88)
`,
);

const errorRes = await ask([
  { role: "user", content: [
    { type: "text", text: "Bu ekran goruntusundeki hata nedir? Hatayi aynen soyle." },
    { type: "image_url", image_url: { url: errorUrl, detail: "high" } },
  ]},
]);

const f1 = makeJpeg("/tmp/zunoza-vision/f1.jpg", `
from PIL import Image, ImageDraw, ImageFont
im = Image.new("RGB", (480, 270), (12, 40, 80))
d = ImageDraw.Draw(im)
font = ImageFont.load_default()
d.text((40, 110), "KARE 1  kirmizi top", fill="white", font=font)
d.ellipse([300, 80, 420, 200], fill=(220, 40, 40))
im.save("/tmp/zunoza-vision/f1.jpg", "JPEG", quality=80)
`);
const f2 = makeJpeg("/tmp/zunoza-vision/f2.jpg", `
from PIL import Image, ImageDraw, ImageFont
im = Image.new("RGB", (480, 270), (12, 40, 80))
d = ImageDraw.Draw(im)
font = ImageFont.load_default()
d.text((40, 110), "KARE 2  yesil kutu", fill="white", font=font)
d.rectangle([300, 80, 430, 200], fill=(40, 180, 70))
im.save("/tmp/zunoza-vision/f2.jpg", "JPEG", quality=80)
`);
const f3 = makeJpeg("/tmp/zunoza-vision/f3.jpg", `
from PIL import Image, ImageDraw, ImageFont
im = Image.new("RGB", (480, 270), (12, 80, 40))
d = ImageDraw.Draw(im)
font = ImageFont.load_default()
d.text((40, 110), "KARE 3  mavi yildiz bitti", fill="white", font=font)
im.save("/tmp/zunoza-vision/f3.jpg", "JPEG", quality=80)
`);

const videoRes = await ask([
  { role: "user", content: [
    { type: "text", text: "Bu video karelerini sirayla ozetle. Hangi sekiller gorunuyor?" },
    { type: "image_url", image_url: { url: f1, detail: "high" } },
    { type: "image_url", image_url: { url: f2, detail: "high" } },
    { type: "image_url", image_url: { url: f3, detail: "high" } },
  ]},
]);

const follow = await ask([
  { role: "user", content: [
    { type: "text", text: "Bu nedir?" },
    { type: "image_url", image_url: { url: errorUrl, detail: "high" } },
  ]},
  { role: "assistant", content: "Ekranda bir sertifika hatasi var." },
  { role: "user", content: [
    { type: "text", text: "Hatadaki kod tam olarak ne?" },
    { type: "image_url", image_url: { url: errorUrl, detail: "high" } },
  ]},
]);

const out = {
  error: {
    ok: errorRes
... 