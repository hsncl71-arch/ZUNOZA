import { getSql } from "@/lib/db";
import {
  iyzicoConfigured,
  retrieveCheckoutForm,
  verifyWebhookSignatureV3,
} from "@/lib/zunoza/iyzico";
import { creditSuccessfulPayment } from "@/lib/zunoza/payments";

function appOrigin(request: Request) {
  const envUrl = (process.env.BETTER_AUTH_URL || process.env.APP_URL || "").trim().replace(/\/$/, "");
  if (envUrl) return envUrl;
  const url = new URL(request.url);
  const proto = request.headers.get("x-forwarded-proto") || url.protocol.replace(":", "") || "https";
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || url.host;
  return `${proto}://${host}`;
}

export async function settleCheckoutToken(token: string) {
  const sql = await getSql();
  const [existing] = await sql<Record<string, unknown>>`
    select * from payment_orders where token = ${token} limit 1
  `;
  const retrieved = await retrieveCheckoutForm(
    token,
    existing?.conversation_id ? String(existing.conversation_id) : undefined,
  );
  const conversationId = retrieved.conversationId || (existing ? String(existing.conversation_id) : "");
  if (!conversationId) {
    return {
      ok: false as const,
      status: "basarisiz",
      message: "Ödeme doğrulanamadı.",
      orderId: existing ? String(existing.id) : null,
    };
  }
  const [order] = await sql<Record<string, unknown>>`
    select * from payment_orders where conversation_id = ${conversationId} or id = ${conversationId}
  `;
  if (!order) {
    return { ok: false as const, status: "basarisiz", message: "Ödeme kaydı eşleşmedi.", orderId: null };
  }
  return { ...(await creditSuccessfulPayment(String(order.id), retrieved)), orderId: String(order.id) };
}

export async function handleIyzicoWebhook(request: Request) {
  if (!iyzicoConfigured()) return new Response("not configured", { status: 503 });
  const payload = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const signature = request.headers.get("x-iyz-signature-v3") || request.headers.get("X-IYZ-SIGNATURE-V3");
  if (signature && !verifyWebhookSignatureV3(signature, payload)) {
    return new Response("invalid signature", { status: 401 });
  }
  const token = typeof payload.token === "string" ? payload.token : "";
  if (!token) return new Response("ok", { status: 200 });
  await settleCheckoutToken(token);
  return new Response("ok", { status: 200 });
}

export async function handleIyzicoCallback(request: Request) {
  const url = new URL(request.url);
  let token = url.searchParams.get("token") || "";
  if (request.method === "POST") {
    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
      if (typeof body.token === "string") token = body.token;
    } else {
      const form = await request.formData().catch(() => null);
      const fromForm = form?.get("token");
      if (typeof fromForm === "string") token = fromForm;
    }
  }
  const origin = appOrigin(request);
  if (!token || !iyzicoConfigured()) {
    return Response.redirect(`${origin}/paketler?odeme=basarisiz`, 303);
  }
  const settled = await settleCheckoutToken(token);
  const flag = settled.ok ? "basarili" : "basarisiz";
  const orderQ = settled.orderId ? `&siparis=${encodeURIComponent(settled.orderId)}` : "";
  return Response.redirect(`${origin}/paketler?odeme=${flag}${orderQ}`, 303);
}
