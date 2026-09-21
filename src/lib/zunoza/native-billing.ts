/** Capacitor Billing / StoreKit bridge. Web has no store session. */

import { registerPlugin } from "@capacitor/core";
import { nativeStore } from "./native-platform.ts";
import type { StoreProduct } from "./store-billing.ts";

const NOT_CONNECTED =
  "Mağaza içi satın alma henüz Apple/Google ürün onayı ve imza hesabı olmadan tahsilat yapamaz. Kredi yüklenmez.";

type NativePurchaseResult = {
  transactionId: string;
  receipt: string;
  productId: string;
};

type ZunozaBillingPlugin = {
  purchase(options: { productId: string; kind: string }): Promise<NativePurchaseResult>;
  restore(): Promise<{ transactions: NativePurchaseResult[] }>;
};

const ZunozaBilling = registerPlugin<ZunozaBillingPlugin>("ZunozaBilling");

export async function nativeBillingPurchase(product: StoreProduct): Promise<NativePurchaseResult & { platform: "ios" | "android" }> {
  const store = nativeStore();
  if (store !== "ios" && store !== "android") {
    throw new Error(NOT_CONNECTED);
  }
  const productId = store === "ios" ? product.appleProductId : product.googleProductId;
  const paid = await ZunozaBilling.purchase({ productId, kind: product.kind });
  const transactionId = String(paid?.transactionId || "").trim();
  if (!transactionId) throw new Error(NOT_CONNECTED);
  return {
    transactionId,
    receipt: String(paid.receipt || transactionId),
    productId: String(paid.productId || productId),
    platform: store,
  };
}

export async function nativeBillingRestore() {
  const store = nativeStore();
  if (store !== "ios" && store !== "android") {
    throw new Error(NOT_CONNECTED);
  }
  const pack = await ZunozaBilling.restore();
  return { platform: store, transactions: pack?.transactions ?? [] };
}
