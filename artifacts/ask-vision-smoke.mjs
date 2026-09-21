import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";

const apiKey = process.env.XAI_API_KEY?.trim();
if (!apiKey) {
  console.log("SKIP: XAI_API_KEY missing");
  process.exit(2);
}

mkdirSync("/tmp/zunoza-vision", { recursive: true });
const label = "/tmp/zunoza-vision/arveles.jpg";
const py = spawnSync(
  "python3",
  [
    "-c",
    `
from PIL import Image, ImageDraw, ImageFont
im = Image.new("RGB", (640, 360), (248, 248, 252))
d = ImageDraw.Draw(im)
d.rectangle([24, 24, 616, 336], outline=(30, 64, 175), width=6)
d.rectangle([40, 70, 600, 150], fill=(30, 64, 175))
try:
    font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 36)
    small = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 22)
except Exception:
    font = ImageFont.load_default()
    small = font
d.text((56, 92), "ARVELES 25 mg", fill="white", font=font)
d.text((56, 180), "Film Tablet", fill=(20, 20, 40), font=small)
d.text((56, 220), "Dexketoprofen", fill=(20, 20, 40), font=small)
d.text((56, 260), "20 Film Tablet", fill=(20, 20, 40), font=small)
im.save(${JSON.stringify(label)}, "JPEG", quality=86)
`,
  ],
  { encoding: "utf8" },
);
if (py.status !== 0) {
  console.error(py.stderr || py.stdout);
  process.exit(1);
}

const b64 = readFileSync(label).toString("base64");
const dataUrl = `data:image/jpeg;base64,${b64}`;
const body = {
  model: "grok-4-fast-non-reasoning",
  temperature: 0.1,
  max_tokens: 220,
  messages: [
    {
      role: "system",
      content: "Kisa Turkce cevap ver. Gormedigin seyi uydurma.",
    },
    {
      role: "user",
      content: [
        { type: "text", text: "Bu fotografta ne var? Ilacin adini ve dozunu oku." },
        { type: "image_url", image_url: { url: dataUrl, detail: "high" } },
      ],
    },
  ],
};

const res = await fetch("https://api.x.ai/v1/chat/completions", {
  method: "POST",
  headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
  body: JSON.stringify(body),
  signal: AbortSignal.timeout(40_000),
});
const json = await res.json().catch(() => ({}));
const text = json?.choices?.[0]?.message?.content || "";
const err = json?.error?.message || json?.message || "";
const out = {
  status: res.status,
  model: json?.model || body.model,
  text,
  error: err,
  sawArveles: /arveles/i.test(text),
  saw25: /25/.test(text),
};
writeFileSync("/tmp/zunoza-vision/result.json", JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
if (res.ok && out.sawArveles) process.exit(0);
process.exit(1);
