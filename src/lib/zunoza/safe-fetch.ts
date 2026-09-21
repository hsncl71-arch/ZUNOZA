/** Outbound fetch allowlist — blocks SSRF to metadata/private networks. */

const BLOCKED_HOST =
  /^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\]|::1|metadata\.google\.internal)$/i;

const PRIVATE_V4 =
  /^(10\.|127\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.|0\.|100\.64\.)/;

const ALLOWED_HOST = [
  /(^|\.)x\.ai$/i,
  /(^|\.)elevenlabs\.io$/i,
  /(^|\.)iyzipay\.com$/i,
  /(^|\.)shotstack\.io$/i,
  /(^|\.)r2\.cloudflarestorage\.com$/i,
  /(^|\.)r2\.dev$/i,
  /(^|\.)cloudflare\.com$/i,
  /(^|\.)grok\.me$/i,
  /(^|\.)grok-sandbox\.com$/i,
  /(^|\.)googleapis\.com$/i,
];

export function isPrivateOrLocalHost(hostname: string) {
  const host = hostname.trim().replace(/^\[|\]$/g, "").toLowerCase();
  if (!host) return true;
  if (BLOCKED_HOST.test(host)) return true;
  if (PRIVATE_V4.test(host)) return true;
  if (host.includes(":")) return true;
  return false;
}

export function isAllowedOutboundHost(hostname: string) {
  if (isPrivateOrLocalHost(hostname)) return false;
  return ALLOWED_HOST.some((re) => re.test(hostname));
}

export function parseSafeHttpsUrl(raw: string) {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:") return null;
  if (parsed.username || parsed.password) return null;
  if (!isAllowedOutboundHost(parsed.hostname)) return null;
  return parsed;
}

export function isSafeMediaSource(value: string) {
  if (value.startsWith("data:image/jpeg") || value.startsWith("data:image/png") || value.startsWith("data:image/webp")) {
    return true;
  }
  return Boolean(parseSafeHttpsUrl(value));
}

export async function fetchAllowedHttps(url: string, timeoutMs = 30_000) {
  const parsed = parseSafeHttpsUrl(url);
  if (!parsed) return null;
  const res = await fetch(parsed.toString(), {
    method: "GET",
    redirect: "error",
    signal: AbortSignal.timeout(timeoutMs),
  });
  return res;
}
