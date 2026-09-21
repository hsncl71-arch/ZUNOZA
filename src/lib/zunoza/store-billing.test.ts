import assert from "node:assert/strict";
import test from "node:test";
import { STORE_BILLING_READY, storeProductForPackage, STORE_PRODUCTS, STORE_SUBSCRIPTION_PLANS, NATIVE_STORE_VERIFY_DISABLED } from "./store-billing.ts";
import { readFileSync } from "node:fs";

test("every credit and premium package has IAP ids", () => {
  for (const id of ["mini", "baslangic", "plus", "pro", "ultra", "max", "weekly", "monthly", "sixmo", "yearly"]) {
    const row = storeProductForPackage(id);
    assert.ok(row, id);
    assert.match(row!.appleProductId, /^com\.zunoza\.app\./);
    assert.ok(row!.googleProductId.length > 3);
  }
  assert.equal(STORE_PRODUCTS.length, 10);
  assert.equal(STORE_BILLING_READY, false);
  assert.deepEqual([...STORE_SUBSCRIPTION_PLANS], ["weekly", "monthly"]);
});

test("store receipt handler cannot credit without Apple/Google verify", () => {
  const src = readFileSync(new URL("./payments.ts", import.meta.url), "utf8");
  assert.match(src, /completeStorePurchase/);
  assert.match(src, /inspectStorePurchase/);
  assert.doesNotMatch(src.split("completeStorePurchase")[1]!.slice(0, 900), /chargeCredits|settlePayment|grantCredits/);
  assert.ok(NATIVE_STORE_VERIFY_DISABLED.includes("Kredi yüklenmedi"));
});
