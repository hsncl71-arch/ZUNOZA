/** Browser hardening headers. frame-ancestors keeps Grok preview embed working. */

export const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-DNS-Prefetch-Control": "off",
  "Permissions-Policy": "camera=(), geolocation=(), payment=(), microphone=(self)",
  "Content-Security-Policy":
    "upgrade-insecure-requests; frame-ancestors 'self' https://zunoza.com https://www.zunoza.com https://*.grok.me https://*.grok-sandbox.com https://grok.com https://*.grok.com https://x.com https://*.x.ai; base-uri 'self'; object-src 'none'",
};

export function applySecurityHeaders(headers: Headers) {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    if (!headers.has(key)) headers.set(key, value);
  }
  return headers;
}
