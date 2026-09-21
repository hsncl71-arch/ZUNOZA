/** Production callbacks and payment redirects must be HTTPS. Local preview stays HTTP. */
export function publicAppOrigin(request: Request | undefined) {
  const envUrl = (process.env.BETTER_AUTH_URL || process.env.APP_URL || "").trim().replace(/\/$/, "");
  if (envUrl) {
    try {
      const parsed = new URL(envUrl.includes("://") ? envUrl : `https://${envUrl}`);
      if (!isLocalHost(parsed.hostname) && parsed.protocol === "http:") parsed.protocol = "https:";
      return parsed.origin;
    } catch {
      return envUrl;
    }
  }
  if (!request) return "";
  const host =
    request.headers.get("x-forwarded-host") || request.headers.get("host") || "";
  if (!host) return "";
  const hostname = host.split(":")[0] || host;
  if (!isTrustedAppHost(hostname)) return "";
  const proto = isLocalHost(hostname)
    ? request.headers.get("x-forwarded-proto") || "http"
    : "https";
  return `${proto}://${host}`;
}

function isLocalHost(hostname: string) {
  return /^(localhost|127\.0\.0\.1|\[::1\])$/i.test(hostname);
}

function isTrustedAppHost(hostname: string) {
  if (isLocalHost(hostname)) return true;
  const host = hostname.toLowerCase();
  if (host === "grok.me" || host.endsWith(".grok.me") || host.endsWith(".grok-sandbox.com")) {
    return true;
  }
  return host === "zunoza.com" || host === "www.zunoza.com" || host === "app.zunoza.com";
}
