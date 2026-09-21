import { getSql } from "@/lib/db";
import {
  iyzicoConfigured,
  retrieveCheckoutForm,
  webhookSignatureAccepted,
  isIyzicoRefundEvent,
  probeIyzicoLive,
} from "@/lib/zunoza/iyzico.server";
import { creditSuccessfulPayment, clawbackByIyzicoPayload } from "@/lib/zunoza/payments";
import { publicAppOrigin } from "@/lib/zunoza/public-origin";
import { requireMediaUser } from "@/lib/zunoza/media-auth.server";
import { requireAdmin } from "@/lib/zunoza/owner";

export async function settleCheckoutToken(token: string) {
  const sql = await getSql();
  const [existing] = await sql<Record<string, unknown>>`
    select * from payment_orders where token = ${token} limit 1
  `;
  let retrieved: Awaited<ReturnType<typeof retrieveCheckoutForm>>;
  try {
    retrieved = await retrieveCheckoutForm(
      token,
      existing?.conversation_id ? String(existing.conversation_id) : undefined,
    );
  } catch {
    return {
      ok: false as const,
      status: "bekliyor",
      message: "Ödemeniz alındı. Paketiniz doğrulanıyor.",
      already: false as const,
      orderId: existing ? String(existing.id) : null,
      packageName: existing ? String(existing.package_name || "") : "",
      credits: existing ? Math.trunc(Number(existing.credits) || 0) : 0,
      priceTry: existing ? Number(existing.price_try) || 0 : 0,
      balance: null,
    };
  }
  let order = existing;
  if (!order) {
    const conversationId = String(retrieved.conversationId || "").trim();
    if (conversationId) {
      const rows = await sql<Record<string, unknown>>`
        select * from payment_orders where conversation_id = ${conversationId} or id = ${conversationId} limit 1
      `;
      order = rows[0];
    }
  }
  if (!order) {
    return {
      ok: false as const,
      status: "bekliyor",
      message: "Ödemeniz alındı. Paketiniz doğrulanıyor.",
      already: false as const,
      orderId: null,
      packageName: "",
      credits: 0,
      priceTry: 0,
      balance: null,
    };
  }
  return { ...(await creditSuccessfulPayment(String(order.id), retrieved)), orderId: String(order.id) };
}

export async function handleIyzicoWebhook(request: Request) {
  if (!iyzicoConfigured()) return new Response("not configured", { status: 503 });
  const payload = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const signature = request.headers.get("x-iyz-signature-v3") || request.headers.get("X-IYZ-SIGNATURE-V3");
  if (!webhookSignatureAccepted(signature, payload)) {
    return new Response("invalid signature", { status: 401 });
  }
  const event = String(payload.iyziEventType ?? payload.eventType ?? "").toLowerCase();
  if (isIyzicoRefundEvent(event)) {
    await clawbackByIyzicoPayload(payload);
    return new Response("ok", { status: 200 });
  }
  const token = typeof payload.token === "string" ? payload.token : "";
  if (!token) return new Response("ok", { status: 200 });
  await settleCheckoutToken(token);
  return new Response("ok", { status: 200 });
}

function redirectPayment(origin: string, dest: string, flag: string, orderId: string | null) {
  const orderQ = orderId ? `&siparis=${encodeURIComponent(orderId)}` : "";
  return Response.redirect(`${origin}${dest}?odeme=${flag}${orderQ}`, 303);
}

function callbackFlag(status: string, ok: boolean) {
  if (ok || status === "basarili") return "basarili";
  if (status === "iptal") return "iptal";
  if (status === "banka") return "banka";
  return "beklemede";
}

export async function handleIyzicoCallback(request: Request) {
  const origin = publicAppOrigin(request);
  try {
    let token = new URL(request.url).searchParams.get("token") || "";
    if (request.method === "POST") {
      if ((request.headers.get("content-type") || "").includes("application/json")) {
        const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
        if (typeof body.token === "string") token = body.token;
      } else {
        const fromForm = (await request.formData().catch(() => null))?.get("token");
        if (typeof fromForm === "string") token = fromForm;
... 