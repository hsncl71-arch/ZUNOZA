/** Save generated media on phone (Share sheet → Photos) or desktop download. */

import { shareNativeFile } from "./native-media.ts";

export function filenameFromDisposition(header: string | null, fallback: string) {
  const raw = String(header || "");
  const star = raw.match(/filename\*=UTF-8''([^;]+)/i);
  if (star?.[1]) {
    try {
      return decodeURIComponent(star[1]).replace(/[/\\]/g, "").replace(/\.\./g, "").slice(0, 80) || fallback;
    } catch {
      /* ignore */
    }
  }
  const basic = raw.match(/filename="?([^";]+)"?/i);
  return (basic?.[1] || fallback).replace(/[/\\]/g, "").replace(/\.\./g, "").slice(0, 80) || fallback;
}

export function canShareFiles(file: File) {
  if (typeof navigator === "undefined") return false;
  const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
  if (typeof nav.share !== "function") return false;
  if (typeof nav.canShare !== "function") return true;
  try {
    return nav.canShare({ files: [file] });
  } catch {
    return false;
  }
}

export async function saveMediaBlob(opts: {
  blob: Blob;
  filename: string;
  title?: string;
}): Promise<"share" | "download" | "cancel"> {
  const type = opts.blob.type || "application/octet-stream";
  const file = new File([opts.blob], opts.filename, { type });
  const native = await shareNativeFile(file, opts.title);
  if (native === "share" || native === "cancel") return native;
  if (canShareFiles(file)) {
    try {
      await navigator.share({
        files: [file],
        title: opts.title || "ZUNOZA",
        text: opts.filename,
      });
      return "share";
    } catch (err) {
      if (err instanceof Error && /abort/i.test(err.name)) return "cancel";
    }
  }
  const href = URL.createObjectURL(opts.blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = opts.filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(href), 4_000);
  return "download";
}

export async function saveMediaFromUrl(opts: {
  url: string;
  filename: string;
  title?: string;
  token?: string | null;
}): Promise<"share" | "download" | "cancel"> {
  const res = await fetch(opts.url, {
    credentials: "include",
    headers: opts.token ? { Authorization: `Bearer ${opts.token}` } : {},
  });
  if (!res.ok) throw new Error("Dosya indirilemedi.");
  const blob = await res.blob();
  const name = filenameFromDisposition(res.headers.get("content-disposition"), opts.filename);
  return saveMediaBlob({ blob, filename: name, title: opts.title });
}
