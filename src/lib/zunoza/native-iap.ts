import { STORE_BILLING_READY, STORE_PRODUCTS, storeProductForPackage } from "./store-billing.ts";
import { inspectStorePurchase, type StoreEventKind } from "./store-verify.ts";

export const NATIVE_IAP_NOT_CONNECTED =
  "Mağaza içi satın alma henüz Apple/Google ürün onayı ve imza hesabı olmadan tahsilat yapamaz. Kredi yüklenmez.";

/** Product ids for StoreKit / Play Billing. Live charge stays off until STORE_BILLING_READY. */
export function nativeIapCatalog() {
  return STORE_PRODUCTS.map((row) => ({
    packageId: row.packageId,
    appleProductId: row.appleProductId,
    googleProductId: row.googleProductId,
    kind: row.kind,
  }));
}

export async function purchaseNativePackage(packageId: string) {
  const product = storeProductForPackage(packageId);
  if (!product) return { ok: false as const, credited: false as const, message: "Bu paket mağazada tanımlı değil." };
  if (!STORE_BILLING_READY) return { ok: false as const, credited: false as const, message: NATIVE_IAP_NOT_CONNECTED };
  try {
    const { nativeBillingPurchase } = await import("./native-billing.ts");
    const paid = await nativeBillingPurchase(product);
    const { completeStorePurchase } = await import("./payments.ts");
    await completeStorePurchase({
      data: {
        packageId: product.packageId,
        platform: paid.platform,
        transactionId: paid.transactionId,
        receipt: paid.receipt,
        event: "purchase",
      },
    });
    return { ok: true as const, credited: true as const, message: "Satın alma doğrulandı. Kredi yüklendi." };
  } catch (err) {
    const message = err instanceof Error ? err.message : NATIVE_IAP_NOT_CONNECTED;
    return { ok: false as const, credited: false as const, message };
  }
}

export async function restoreNativePurchases() {
  if (!STORE_BILLING_READY) return { ok: false as const, credited: false as const, message: NATIVE_IAP_NOT_CONNECTED };
  try {
    const { nativeBillingRestore } = await import("./native-billing.ts");
    const pack = await nativeBillingRestore();
    if (!pack.transactions.length) {
      return { ok: true as const, credited: false as const, message: "Geri yüklenecek satın alma yok." };
    }
    const { completeStorePurchase } = await import("./payments.ts");
    const { storeProductForPackage: lookup } = await import("./store-billing.ts");
    let credited = 0;
    for (const row of pack.transactions) {
      const product =
        STORE_PRODUCTS.find((item) => item.appleProductId === row.productId || item.googleProductId === row.productId) ||
        lookup("");
      if (!product) continue;
      try {
        await completeStorePurchase({
          data: {
            packageId: product.packageId,
            platform: pack.platform,
            transactionId: row.transactionId,
            receipt: row.receipt,
            event: "restore",
          },
        });
        credited += 1;
      } catch {
        /* keep restoring the rest */
      }
    }
    return {
      ok: true as const,
      credited: credited > 0,
      message: credited > 0 ? "Satın almalar geri yüklendi." : "Geri yükleme doğrulanamadı. Kredi yüklenmedi.",
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : NATIVE_IAP_NOT_CONNECTED;
    return { ok: false as const, credited: false as const, message };
  }
}

export function handleNativeStoreEvent(event: StoreEventKind, packageId: string, platform: "ios" | "android", transactionId: string) {
  return inspectStorePurchase({
    packageId,
    platform,
    transactionId,
    receipt: "",
    event,
  });
}
