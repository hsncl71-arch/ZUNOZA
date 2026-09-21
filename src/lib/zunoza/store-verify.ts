/** Server-side StoreKit / Play Billing verify. Never credits until STORE_BILLING_READY. */

import { STORE_BILLING_READY, NATIVE_STORE_VERIFY_DISABLED, storeProductForPackage, type StoreProduct } from "./store-billing.ts";

export type StorePlatform = "ios" | "android";
export type StoreEventKind =
  | "purchase"
  | "restore"
  | "renew"
  | "cancel"
  | "expire"
  | "refund"
  | "pending"
  | "failed";

export const STORE_EVENTS_THAT_CREDIT: StoreEventKind[] = ["purchase", "restore", "renew"];

export const STORE_ACCOUNT_TODOS = [
  { id: "apple-developer", need: "Onaylı Apple Developer Program hesabı" },
  { id: "app-store-connect", need: "App Store Connect’te com.zunoza.app (ZUNOZA AI VIDEO)" },
  { id: "apple-iap-products", need: "6 kredi (consumable) + 4 Premium (auto-renewable) ürünü — kimlikler STORE_PRODUCTS" },
  { id: "apple-server-api", need: "App Store Server API: Issuer ID, Key ID, .p8 — sunucu env (APPLE_IAP_*)" },
  { id: "play-console", need: "Google Play Console’da app.zunoza.mobile" },
  { id: "play-billing-products", need: "Aynı 10 ürün Play Billing’de (in-app + subscription)" },
  { id: "play-service-account", need: "Play Developer API servis hesabı JSON — sunucu env (GOOGLE_PLAY_*)" },
  { id: "store-billing-flag", need: "Doğrulama canlı ve ürünler onaylı olunca STORE_BILLING_READY=true" },
] as const;

export function storeEventWouldCredit(kind: StoreEventKind) {
  return STORE_EVENTS_THAT_CREDIT.includes(kind);
}

export function storeIdempotencyKey(platform: StorePlatform, transactionId: string) {
  return `${platform}:${transactionId.trim()}`;
}

export function inspectStorePurchase(input: {
  packageId: string;
  platform: string;
  transactionId: string;
  receipt: string;
  event?: StoreEventKind;
}): {
  ok: false;
  credited: false;
  message: string;
  product: StoreProduct | null;
  event: StoreEventKind;
} {
  const event = input.event || "purchase";
  const product = storeProductForPackage(input.packageId);
  if (!product) {
    return { ok: false, credited: false, message: "Bu paket mağazada tanımlı değil.", product: null, event };
  }
  if (input.platform !== "ios" && input.platform !== "android") {
    return { ok: false, credited: false, message: "Geçersiz mağaza.", product, event };
  }
  if (!input.transactionId.trim()) {
    return { ok: false, credited: false, message: NATIVE_STORE_VERIFY_DISABLED, product, event };
  }
  if (!STORE_BILLING_READY) {
    return { ok: false, credited: false, message: NATIVE_STORE_VERIFY_DISABLED, product, event };
  }
  return { ok: false, credited: false, message: NATIVE_STORE_VERIFY_DISABLED, product, event };
}

export function storeVerifyCannotCredit(message: string) {
  return /Kredi yüklenmedi|tanımlı değil|Geçersiz mağaza/i.test(message);
}
