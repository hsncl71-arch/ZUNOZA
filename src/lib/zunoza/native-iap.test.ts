import assert from "node:assert/strict";
import test from "node:test";
import { NATIVE_IAP_NOT_CONNECTED, nativeIapCatalog, purchaseNativePackage, restoreNativePurchases } from "./native-iap.ts";
import { STORE_BILLING_READY } from "./store-billing.ts";

test("native IAP never reports a successful charge before store accounts exist", async () => {
  assert.equal(STORE_BILLING_READY, false);
  const miss = await purchaseNativePackage("nope");
  assert.equal(miss.ok, false);
  const mini = await purchaseNativePackage("mini");
  assert.equal(mini.ok, false);
  assert.equal(mini.credited, false);
  assert.equal(mini.message, NATIVE_IAP_NOT_CONNECTED);
  const restore = await restoreNativePurchases();
  assert.equal(restore.ok, false);
  assert.equal(restore.credited, false);
});

test("IAP catalog lists Apple and Google ids without enabling charges", () => {
  const catalog = nativeIapCatalog();
  assert.equal(catalog.length, 10);
  assert.ok(catalog.every((row) => row.appleProductId && row.googleProductId));
  assert.equal(STORE_BILLING_READY, false);
});
