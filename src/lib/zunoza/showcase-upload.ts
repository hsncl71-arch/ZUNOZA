/** Admin homepage catalog upload. Same-origin chunks, original bytes and audio. */

import { sniffVideoContainer, type ShowcaseLane } from "./showcase.ts";

export const SHOWCASE_VIDEO_MAX_BYTES = 512 * 1024 * 1024;
export const SHOWCASE_CHUNK_BYTES = 3 * 1024 * 1024;
export const SHOWCASE_VIDEO_ACCEPT = "video/mp4,video/quicktime,video/x-m4v,video/hevc,.mp4,.mov,.m4v";

export function showcaseVideoSizeError(bytes: number) {
  if (bytes <= SHOWCASE_VIDEO_MAX_BYTES) return null;
  return `Bu dosya ${Math.round(SHOWCASE_VIDEO_MAX_BYTES / (1024 * 1024))} MB üstünde. 15 saniyelik MP4 veya MOV seçin.`;
}

type CatalogJson = {
  error?: string;
  id?: string;
  previewUrl?: string;
  lane?: ShowcaseLane;
  key?: string;
  clipId?: string;
  uploadId?: string;
  previous?: string | null;
  partNumber?: number;
};

function authHeaders(token: string | null, json = false) {
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (json) headers["Content-Type"] = "application/json";
  return headers;
}

function parseBody(text: string, status: number): CatalogJson {
  try {
    return JSON.parse(text || "{}") as CatalogJson;
  } catch {
    if (status === 413) return { error: "Parça çok büyük geldi. Sayfayı yenileyip tekrar deneyin." };
    if (status === 502 || status === 504) return { error: "Yükleme tamamlanamadı. Tekrar deneyin." };
    return {};
  }
}

function fail(json: CatalogJson, status: number): never {
  if (status === 401) throw new Error("Oturum gerekli. Yönetici hesabıyla giriş yapın.");
  if (status === 403) throw new Error("Bu işlem yalnızca yönetici hesabına açıktır.");
  throw new Error(json.error || `Yükleme başarısız (${status}).`);
}

async function postJson(token: string | null, body: Record<string, unknown>) {
  const res = await fetch("/api/vitrin-yukle", {
    method: "POST",
    credentials: "include",
    headers: authHeaders(token, true),
    body: JSON.stringify(body),
  });
  const json = parseBody(await res.text(), res.status);
  if (!res.ok) fail(json, res.status);
  return json;
}

function postPart(opts: {
  token: string | null;
  uploadId: string;
  key: string;
  partNumber: number;
  blob: Blob;
}): Promise<CatalogJson> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/vitrin-yukle");
    xhr.withCredentials = true;
    if (opts.token) xhr.setRequestHeader("Authorization", `Bearer ${opts.token}`);
    xhr.onerror = () => reject(new Error("Yükleme bağlantısı kesildi. Tekrar deneyin."));
    xhr.onload = () => {
      const json = parseBody(xhr.responseText || "", xhr.status);
      if (xhr.status < 200 || xhr.status >= 300 || !json.partNumber) {
        try {
          fail(json, xhr.status);
        } catch (err) {
          reject(err);
        }
        return;
      }
      resolve(json);
    };
    const body = new FormData();
    body.append("phase", "part");
    body.append("uploadId", opts.uploadId);
    body.append("key", opts.key);
    body.append("partNumber", String(opts.partNumber));
    body.append("file", opts.blob, `part-${opts.partNumber}.bin`);
    xhr.send(body);
  });
}

export async function postShowcaseVideo(opts: {
  file: File;
  lane: ShowcaseLane;
  action: "replace" | "create";
  clipId?: string;
  afterId?: string;
  token: string | null;
  onProgress?: (pct: number) => void;
}): Promise<{ id: string; previewUrl: string; lane: ShowcaseLane }> {
  const sizeErr = showcaseVideoSizeError(opts.file.size);
  if (sizeErr) throw new Error(sizeErr);
  const header = new Uint8Array(await opts.file.slice(0, 64).arrayBuffer());
  if (!sniffVideoContainer(header)) {
    throw new Error("Dosya MP4 veya MOV değil. Videoyu kesmeden, orijinal haliyle yükleyin.");
  }
  opts.onProgress?.(2);
  const start = await postJson(opts.token, {
    phase: "start",
    action: opts.action,
    lane: opts.lane,
    clipId: opts.clipId,
    afterId: opts.afterId,
    filename: opts.file.name,
    mime: opts.file.type || "video/mp4",
    size: opts.file
... 