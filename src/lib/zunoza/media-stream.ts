import { fetchAllowedHttps } from "./safe-fetch.ts";
import { headR2Object, isR2ObjectRef, r2ObjectKey, streamR2Object } from "./r2.ts";

export function parseByteRange(header: string | null | undefined, size: number) {
  if (!header || size <= 0) return null;
  const match = header.trim().match(/^bytes=(\d*)-(\d*)$/i);
  if (!match) return null;
  let start = match[1] ? Number(match[1]) : 0;
  let end = match[2] ? Number(match[2]) : size - 1;
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  if (match[1] === "" && match[2]) {
    const suffix = Number(match[2]);
    if (!suffix) return null;
    start = Math.max(0, size - suffix);
    end = size - 1;
  }
  if (start < 0 || end < start || start >= size) return null;
  return { start, end: Math.min(end, size - 1) };
}

function bodyOf(bytes: Uint8Array): BodyInit {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy;
}

export function videoHeadResponse(size: number, filename: string) {
  return new Response(null, {
    status: 200,
    headers: {
      "Content-Type": "video/mp4",
      "Accept-Ranges": "bytes",
      "Cache-Control": "private, max-age=3600",
      "Content-Disposition": `inline; filename="${filename}"`,
      "X-Content-Type-Options": "nosniff",
      "Content-Length": String(size),
    },
  });
}

export function videoFileResponse(bytes: Uint8Array, request: Request, filename: string) {
  const size = bytes.byteLength;
  const type = "video/mp4";
  const range = parseByteRange(request.headers.get("range"), size);
  const headers: Record<string, string> = {
    "Content-Type": type,
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, max-age=3600",
    "Content-Disposition": `inline; filename="${filename}"`,
    "X-Content-Type-Options": "nosniff",
  };
  if (request.method === "HEAD") {
    headers["Content-Length"] = String(size);
    return new Response(null, { status: 200, headers });
  }
  if (!range) {
    headers["Content-Length"] = String(size);
    return new Response(bodyOf(bytes), { status: 200, headers });
  }
  const slice = bytes.subarray(range.start, range.end + 1);
  headers["Content-Length"] = String(slice.byteLength);
  headers["Content-Range"] = `bytes ${range.start}-${range.end}/${size}`;
  return new Response(bodyOf(slice), { status: 206, headers });
}

export function rangedVideoResponse(
  bytes: Uint8Array,
  request: Request,
  filename: string,
  upstream?: { status: number; contentRange: string | null },
) {
  if (upstream?.status === 206 && upstream.contentRange && request.method !== "HEAD") {
    const headers: Record<string, string> = {
      "Content-Type": "video/mp4",
      "Accept-Ranges": "bytes",
      "Cache-Control": "private, max-age=3600",
      "Content-Disposition": `inline; filename="${filename}"`,
      "X-Content-Type-Options": "nosniff",
      "Content-Range": upstream.contentRange,
      "Content-Length": String(bytes.byteLength),
    };
    return new Response(bodyOf(bytes), { status: 206, headers });
  }
  return videoFileResponse(bytes, request, filename);
}

export function pipeVideoResponse(upstream: Response, filename: string) {
  const headers: Record<string, string> = {
    "Content-Type": "video/mp4",
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, max-age=3600",
    "Content-Disposition": `inline; filename="${filename}"`,
    "X-Content-Type-Options": "nosniff",
  };
  const len = upstream.headers.get("content-length");
  const range = upstream.headers.get("content-range");
  if (len) headers["Content-Length"] = len;
  if (range) headers["Content-Range"] = range;
  return new Response(upstream.body, { status: upstream.status, headers });
}

export async function serveStoredVideo(stored: string, request: Request, filename: string) {
  if (request.method === "HEAD" && isR2ObjectRef(stored)) {
    const meta = await headR2Object(r2ObjectKey(stored));
    if (meta.ok) {
      const size = Number(meta.contentLength || 0);
      if (Number.isFinite(size) && size > 0) return videoHeadResponse(size, filename);
    }
  }
  if (isR2ObjectRef(stored)) {
    const streamed = await streamR2Object(r2ObjectKey(stored), request.headers.get("range"));
    if (!streamed.ok || !streamed.response) return new Response("Video alınamadı", { status: streamed.status || 502 });
    return pipeVideoResponse(streamed.response, filename);
  }
  const ext = await fetchExternalVideo(stored, request);
  if (!ext) return new Response("Video alınamadı", { status: 502 });
  return rangedVideoResponse(ext.bytes, request, filename, ext.upstream);
}
  const media = await fetchAllowedHttps(url, 120_000);
  if (!media?.ok) return null;
  const bytes = new Uint8Array(await media.arrayBuffer());
  if (bytes.byteLength < 32) return null;
  return bytes;
}
