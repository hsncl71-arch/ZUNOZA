/**
 * Production Google/X OAuth start: top-level 302 into the broker so the
 * callback stays in the same browsing context (needed on grok.me / iPhone).
 * Do not import this from client code.
 */
import { auth } from "./server";
import { APPLE_SIGN_IN, GROK_PROVIDERS } from "./providers";
import { appleConfigured } from "./apple";

const ALLOWED = new Set([...GROK_PROVIDERS.map((p) => p.providerId), APPLE_SIGN_IN.providerId]);

export async function handleOAuthStartRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const providerId = url.searchParams.get("providerId")?.trim() || "";
  if (!ALLOWED.has(providerId)) {
    return Response.redirect(new URL("/login?error=oauth", url.origin), 302);
  }
  if (providerId === APPLE_SIGN_IN.providerId && !appleConfigured) {
    return Response.redirect(new URL("/login?error=oauth", url.origin), 302);
  }

  const origin = url.origin;
  const callbackURL = `${origin}/giris-donus`;
  const errorCallbackURL = `${origin}/login?error=oauth`;

  try {
    const apiRes = await auth.api.signInWithOAuth2({
      body: { providerId, callbackURL, errorCallbackURL },
      headers: request.headers,
      asResponse: true,
    });

    const locationHeader = apiRes.headers.get("location");
    if (apiRes.status >= 300 && apiRes.status < 400 && locationHeader) {
      const headers = new Headers({ location: locationHeader, "cache-control": "no-store" });
      for (const cookie of apiRes.headers.getSetCookie()) headers.append("set-cookie", cookie);
      return new Response(null, { status: 302, headers });
    }

    const body = (await apiRes.json().catch(() => null)) as { url?: string } | null;
    const location = body?.url;
    if (!location) {
      return Response.redirect(errorCallbackURL, 302);
    }

    const headers = new Headers({ location, "cache-control": "no-store" });
    for (const cookie of apiRes.headers.getSetCookie()) headers.append("set-cookie", cookie);
    return new Response(null, { status: 302, headers });
  } catch {
    return Response.redirect(errorCallbackURL, 302);
  }
}
