/** Store IAP product map. Web iyzico stays on grok.me; native apps must use IAP. */

export type StoreProduct = {
  packageId: string;
  appleProductId: string;
  googleProductId: string;
  kind: "consumable" | "subscription";
};

const APPLE_PREFIX = "com.zunoza.app";

export const STORE_PRODUCTS: StoreProduct[] = [
  { packageId: "mini", appleProductId: `${APPLE_PREFIX}.credits.mini`, googleProductId: "credits_mini", kind: "consumable" },
  { packageId: "baslangic", appleProductId: `${APPLE_PREFIX}.credits.baslangic`, googleProductId: "credits_baslangic", kind: "consumable" },
  { packageId: "plus", appleProductId: `${APPLE_PREFIX}.credits.plus`, googleProductId: "credits_plus", kind: "consumable" },
  { packageId: "pro", appleProductId: `${APPLE_PREFIX}.credits.pro`, googleProductId: "credits_pro", kind: "consumable" },
  { packageId: "ultra", appleProductId: `${APPLE_PREFIX}.credits.ultra`, googleProductId: "credits_ultra", kind: "consumable" },
  { packageId: "max", appleProductId: `${APPLE_PREFIX}.credits.max`, googleProductId: "credits_max", kind: "consumable" },
  { packageId: "weekly", appleProductId: `${APPLE_PREFIX}.premium.weekly`, googleProductId: "premium_weekly", kind: "subscription" },
  { packageId: "monthly", appleProductId: `${APPLE_PREFIX}.premium.monthly`, googleProductId: "premium_monthly", kind: "subscription" },
  { packageId: "sixmo", appleProductId: `${APPLE_PREFIX}.premium.sixmo`, googleProductId: "premium_sixmo", kind: "subscription" },
  { packageId: "yearly", appleProductId: `${APPLE_PREFIX}.premium.yearly`, googleProductId: "premium_yearly", kind: "subscription" },
];

export function storeProductForPackage(packageId: string) {
  const id = String(packageId || "").trim();
  return STORE_PRODUCTS.find((row) => row.packageId === id) ?? null;
}

export const STORE_BILLING_READY = false;

/** Native subscription SKUs. Credits stay consumable; these are the store subscriptions. */
export const STORE_SUBSCRIPTION_PLANS = ["weekly", "monthly"] as const;

export const NATIVE_IYZICO_BLOCKED_MESSAGE =
  "Bu satın alma uygulama mağazası üzerinden yapılır. Web’deki iyzico bu uygulamada kullanılmaz.";

export const NATIVE_STORE_VERIFY_DISABLED =
  "Mağaza makbuzu doğrulaması henüz açık değil. Kredi yüklenmedi.";
