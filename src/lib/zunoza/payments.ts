import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { ensureProfile } from "@/lib/zunoza/api";
import { isOwnerUser, requireAdmin } from "@/lib/zunoza/owner";
import { isRealEmail, maskEmail } from "@/lib/zunoza/privacy-mask";
import { publicAppOrigin } from "@/lib/zunoza/public-origin";
import { payablePackageTry, payableTryAmount } from "@/lib/zunoza/package-price";
import { assertAiRateLimit } from "@/lib/zunoza/ai-usage";
import { buyerNameFromAccount, isBuyerFieldError, parseBuyerName, parseBuyerCity, mergeCheckoutBuyerInput, parseGsmNumber, parseIdentityNumber } from "@/lib/zunoza/iyzico-buyer";
import { webIyzicoAllowedFromUserAgent } from "@/lib/zunoza/native-platform";
import { NATIVE_IYZICO_BLOCKED_MESSAGE } from "@/lib/zunoza/store-billing";

export type PaymentOrder = {
  id: string;
  userId: string;
  packageId: string;
  packageName: string;
  credits: number;
  priceTry: number;
  status: string;
  providerPaymentId: string | null;
  publicRef: string;
  errorMessage: string | null;
  createdAt: string;
  creditedAt: string | null;
};

function assertWebIyzicoChannel() {
  const ua = getRequest().headers.get("user-agent") || "";
  if (!webIyzicoAllowedFromUserAgent(ua)) throw new Error(NATIVE_IYZICO_BLOCKED_MESSAGE);
}

function publicPaymentRef(row: Record<string, unknown>) {
  const payId = row.provider_payment_id ? String(row.provider_payment_id) : "";
  if (payId.length >= 6) return payId.slice(-8);
  return String(row.id || "").slice(0, 8);
}

function mapOrder(row: Record<string, unknown>): PaymentOrder {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    packageId: String(row.package_id),
    packageName: String(row.package_name),
    credits: Number(row.credits),
    priceTry: Number(row.price_try),
    status: String(row.status),
    providerPaymentId: row.provider_payment_id ? String(row.provider_payment_id) : null,
    publicRef: publicPaymentRef(row),
    errorMessage: row.error_message ? String(row.error_message) : null,
    createdAt: String(row.created_at),
    creditedAt: row.credited_at ? String(row.credited_at) : null,
  };
}

function clientIp(request: Request | undefined) {
  return (
    (request?.headers.get("cf-connecting-ip") ||
      request?.headers.get("true-client-ip") ||
      request?.headers.get("x-forwarded-for") ||
      request?.headers.get("x-real-ip") ||
      "")
      .split(",")[0]
      ?.trim() || ""
  );
}

function appOrigin(request: Request | undefined) {
  return publicAppOrigin(request);
}

async function requireAdminUser(userId: string) {
  const sql = await getSql();
  await requireAdmin(sql, userId);
}

function isRefundedStatus(status: string) {
  return status === "iade" || status === "chargeback";
}

function resolveBuyerName(
  displayName: string | null | undefined,
  email: string,
  buyerName?: string,
  buyerSurname?: string,
) {
  const named = String(buyerName || "").trim();
  const surnamed = String(buyerSurname || "").trim();
  if (named && surnamed) {
    return { name: parseBuyerName(named, "Ad"), surname: parseBuyerName(surnamed, "Soyad") };
  }
  const fromAccount = buyerNameFromAccount(displayName, email);
  return {
    name: named ? parseBuyerName(named, "Ad") : fromAccount.name,
    surname: surnamed ? parseBuyerName(surnamed, "Soyad") : fromAccount.surname,
  };
}

type SavedCheckout = {
  identityNumber: string;
  gsmNumber: string;
  city: string;
};

async function loadSavedCheckout(
  sql: Awaited<ReturnType<typeof getSql>>,
  userId: string,
): Promise<SavedCheckout> {
  const [row] = await sql<{
    checkout_identity_number: string | null;
    checkout_gsm: string | null;
    checkout_city: string | null;
  }>`
    select checkout_identity_number, checkout_gsm, checkout_city
    from zunoza_profiles where user_id = ${userId} limit 1
  `;
  return {
    identityNumber: String(row?.checkout_identity_number || "").trim(),
    gsmNumber: String(row?.checkout_gsm || "").trim(),
    city: String(row?.checkout_city || "").trim(),
  };
}

function mergeCheckoutBuyer(data: { identityNumber?: string; gsmNumber?: string; city?: string }, saved: SavedCheckout) {
  return mergeCheckoutBuyerInput(data, saved);
}

async function saveCheckoutBuyer(
  sql: Awaited<ReturnType<typeof getSql>>,
  userId: string,
  buyer: SavedCheckout,
) {
  try {
    mergeCheckoutBuyerInput(buyer, buyer);
  } catch {
    return;
  }
  await sql`
    update zunoza_profiles
    set checkout_identity_number = ${buyer.identityNumber},
        checkout_gsm = ${buyer.gsmNumber},
        checkout_city = ${buyer.city}
    where user_id = ${userId}
  `;
}

export const getCheckoutBuyer = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const [authUser] = await sql<{ name: string | null; email: string | null }>`
      select name, email from "user" where id = ${context.userId}
    `;
    const [profile] = await sql<{
      display_name: string | null;
      email: string | null;
      checkout_identity_number: string | null;
      checkout_gsm: string | null;
      checkout_city: string | null;
    }>`
      select display_name, email, checkout_identity_number, checkout_gsm, checkout_city
      from zunoza_profiles where user_id = ${context.userId} limit 1
    `;
    const email = profile?.email || authUser?.email || "";
    let name = "";
    let surname = "";
    try {
      const fromAccount = buyerNameFromAccount(profile?.display_name || authUser?.name, email || "user@zunoza.app");
      name = fromAccount.name;
      surname = fromAccount.surname;
    } catch {
      name = "";
      surname = "";
    }
    const identity = String(profile?.checkout_identity_number || "").trim();
    const gsm = String(profile?.checkout_gsm || "").trim();
    const city = String(profile?.checkout_city || "").trim();
    let hasIdentity = false;
    let hasGsm = false;
    let hasCity = false;
    try {
      if (identity) {
        parseIdentityNumber(identity);
        hasIdentity = true;
      }
    } catch {
      hasIdentity = false;
    }
    try {
      if (gsm) {
        parseGsmNumber(gsm);
        hasGsm = true;
      }
    } catch {
      hasGsm = false;
    }
    try {
      if (city) {
        parseBuyerCity(city);
        hasCity = true;
      }
    } catch {
      hasCity = false;
    }
    const hasName = Boolean(name && surname);
    return {
      name,
      surname,
      city: hasCity ? city : "",
      hasName,
      hasIdentity,
      hasGsm,
      hasCity,
      ready: hasName && hasIdentity && hasGsm && hasCity,
    };
  });

function publicPayStartError(err: unknown) {
  const msg = err instanceof Error ? err.message : "";
  if (!msg) return "Ödeme başlatılamadı. Lütfen tekrar deneyin.";
  return msg;
}

export async function creditSuccessfulPayment(
  orderId: string,
  result: {
    paymentStatus?: string;
    status?: string;
    paidPrice?: unknown;
    price?: unknown;
    currency?: string;
    errorMessage?: string;
    signature?: string;
    fraudStatus?: number | string;
    paymentId?: string | number;
  },
) {
  const sql = await getSql();
  const { classifySettlement } = await import("@/lib/zunoza/iyzico.server");
  const [order] = await sql<Record<string, unknown>>`
    select * from payment_orders where id = ${orderId} limit 1
  `;
  if (!order) {
    return { ok: false as const, status: "basarisiz", message: "Ödeme kaydı bulunamadı.", already: false as const };
  }
  if (isRefundedStatus(String(order.status))) {
    return { ok: false as const, status: String(order.status), message: "Ödeme iade edilmiş.", already: false as const };
  }
  if (order.credited_at) {
    return { ok: true as const, status: "basarili", message: "Krediler zaten yüklendi.", already: true as const };
  }
  const expectedTry = Number(order.price_try);
  const outcome = classifySettlement(result, expectedTry);
  const paymentId = result.paymentId != null ? String(result.paymentId) : null;
  if (outcome === "failure") {
    await sql`
      update payment_orders
      set status = ${"basarisiz"},
          provider_payment_id = coalesce(provider_payment_id, ${paymentId}),
          error_message = ${String(result.errorMessage || "iyzico:fail").slice(0, 40)},
          updated_at = now()
      where id = ${orderId} and credited_at is null and status <> 'iade'
    `;
    return { ok:
... 