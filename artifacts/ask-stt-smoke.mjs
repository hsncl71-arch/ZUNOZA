const apiKey = process.env.XAI_API_KEY?.trim();
if (!apiKey) {
  console.log("SKIP: XAI_API_KEY missing");
  process.exit(2);
}

const tts = await fetch("https://api.x.ai/v1/tts", {
  method: "POST",
  headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
  body: JSON.stringify({ text: "Merhaba, ben ZUNOZA. Video konusmasi testi.", voice_id: "sal", language: "tr" }),
  signal: AbortSignal.timeout(25_000),
});
if (!tts.ok) {
  console.log(JSON.stringify({ step: "tts", status: tts.status, body: await tts.text().catch(() => "") }));
  process.exit(1);
}
const bytes = Buffer.from(await tts.arrayBuffer());
const mime = (tts.headers.get("content-type") || "audio/mpeg").split(";")[0];
const form = new FormData();
form.set("language", "tr");
form.set("format", "true");
form.set("file", new Blob([bytes], { type: mime }), "clip.mp3");
const stt = await fetch("https://api.x.ai/v1/stt", {
  method: "POST",
  headers: { Authorization: `Bearer ${apiKey}` },
  body: form,
  signal: AbortSignal.timeout(45_000),
});
const json = await stt.json().catch(() => ({}));
const text = String(json.text || "");
const out = {
  ttsStatus: tts.status,
  sttStatus: stt.status,
  bytes: bytes.byteLength,
  text,
  heard: /merhaba|zunoza|video/i.test(text),
  error: json.error?.message || json.message || "",
};
console.log(JSON.stringify(out, null, 2));
process.exit(out.sttStatus === 200 && out.heard ? 0 : 1);
