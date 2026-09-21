import { createFileRoute } from "@tanstack/react-router";
import { auth } from "@/lib/auth/server";
import { APPLE_CALLBACK_PATH } from "@/lib/auth/apple";
import { isCanonicalOwnerEmail } from "@/lib/zunoza/owner-email";

async function appleFormPostToGet(request: Request): Promise<Response | null> {
  const url = new URL(request.url);
  if (request.method !== "POST" || url.pathname !== APPLE_CALLBACK_PATH) return null;
  const form = await request.formData().catch(() => null);
  if (!form) return null;
  const next = new URL(url);
  for (const key of ["code", "state", "error", "error_description", "user"]) {
    const value = form.get(key);
    if (typeof value === "string" && value) next.searchParams.set(key, value);
  }
  return Response.redirect(next.toString(), 303);
}

async function handleAuth(request: Request) {
  const appleRedirect = await appleFormPostToGet(request);
  if (appleRedirect) return appleRedirect;
  if (request.method === "POST") {
    const path = new URL(request.url).pathname;
    if (path.includes("/sign-up/email")) {
      const body = await request.clone().json().catch(() => null);
      const email =
        body && typeof body === "object" && "email" in body ? String((body as { email?: unknown }).email ?? "") : "";
      if (isCanonicalOwnerEmail(email)) {
        return Response.json(
          { message: "Bu e-posta ile şifreli kayıt açılamaz. Google ile giriş yapın." },
          { status: 400 },
        );
      }
    }
  }
  return auth.handler(request);
}

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: ({ request }) => auth.handler(request),
      POST: ({ request }) => handleAuth(request),
    },
  },
});
