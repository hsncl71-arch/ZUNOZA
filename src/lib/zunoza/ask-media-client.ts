import { transcribeAskAudio } from "@/lib/zunoza/media-stt";

function readFile(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Dosya okunamadı."));
    reader.readAsDataURL(file);
  });
}

function waitEvent(el: EventTarget, name: string, ms = 8000) {
  return new Promise<void>((resolve, reject) => {
    const t = window.setTimeout(() => reject(new Error("timeout")), ms);
    const done = () => {
      window.clearTimeout(t);
      resolve();
    };
    el.addEventListener(name, done, { once: true });
  });
}

async function drawToJpeg(source: CanvasImageSource, width: number, height: number, quality: number) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, width);
  canvas.height = Math.max(1, height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Görsel işlenemedi.");
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", quality);
}

export async function compressAskImage(file: File, max = 1152, quality = 0.74) {
  const type = (file.type || "").toLowerCase();
  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    bitmap = null;
  }
  if (bitmap) {
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
    const url = await drawToJpeg(
      bitmap,
      Math.max(1, Math.round(bitmap.width * scale)),
      Math.max(1, Math.round(bitmap.height * scale)),
      quality,
    );
    bitmap.close();
    return url;
  }
  if (/heic|heif/.test(type) || /\.hei[cf]$/i.test(file.name)) {
    throw new Error("HEIC görsel bu tarayıcıda açılamadı. Fotoğraflar’dan JPEG olarak kaydedin.");
  }
  const raw = await readFile(file);
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Görsel okunamadı."));
    img.src = raw;
  });
  const scale = Math.min(1, max / Math.max(img.width, img.height));
  return drawToJpeg(img, Math.max(1, Math.round(img.width * scale)), Math.max(1, Math.round(img.height * scale)), quality);
}

export async function sampleVideoFrames(file: File, maxFrames = 8) {
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  video.src = url;
  try {
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error("Video okunamadı."));
      window.setTimeout(() => reject(new Error("Video okunamadı.")), 10000);
    });
    await video.play().catch(() => undefined);
    video.pause();
    const duration = Number.isFinite(video.duration) ? video.duration : 0;
    if (duration <= 0) throw new Error("Video süresi okunamadı.");
    const count = duration <= 8 ? 6 : duration <= 30 ? 8 : maxFrames;
    const frames: string[] = [];
    const times: number[] = [];
    for (let i = 0; i < count; i += 1) {
      const t = Math.min(duration - 0.05, Math.max(0.05, ((i + 0.5) / count) * Math.min(duration, 90)));
      times.push(t);
      video.currentTime = t;
      await waitEvent(video, "seeked", 6000).catch(() => undefined);
      const scale = Math.min(1, 768 / Math.max(video.videoWidth || 1, video.videoHeight || 1));
      const jpeg = await drawToJpeg(
        video,
        Math.max(1, Math.round((video.videoWidth || 1) * scale)),
        Math.max(1, Math.round((video.videoHeight || 1) * scale)),
        0.62,
      );
      frames.push(jpeg);
    }
    return { frames, duration, times };
  } finally {
    URL.revokeObjectURL(url);
    video.src = "";
  }
}

export async function transcribeVideoIfSmall(file: File) {
  if (file.size > 2_800_000) return "";
  try {
    const dataUrl = await readFile(file);
    const res = await transcribeAskAudio({ data: { dataUrl, filename: file.name } })
... 