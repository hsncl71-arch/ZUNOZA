import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { STORE_BILLING_READY } from "./store-billing.ts";
import { handleNativeStoreEvent, purchaseNativePackage, restoreNativePurchases } from "./native-iap.ts";
import {
  STORE_ACCOUNT_TODOS,
  inspectStorePurchase,
  storeEventWouldCredit,
  storeIdempotencyKey,
} from "./store-verify.ts";

test("store inspect never credits before Apple/Google verify", () => {
  assert.equal(STORE_BILLING_READY, false);
  const buy = inspectStorePurchase({
    packageId: "mini",
    platform: "ios",
    transactionId: "tx-1",
    receipt: "fake",
    event: "purchase",
  });
  assert.equal(buy.ok, false);
  assert.equal(buy.credited, false);
  assert.match(buy.message, /Kredi yüklenmedi/);
  const restore = inspectStorePurchase({
    packageId: "yearly",
    platform: "android",
    transactionId: "tx-2",
    receipt: "fake",
    event: "restore",
  });
  assert.equal(restore.credited, false);
  assert.equal(storeEventWouldCredit("refund"), false);
  assert.equal(storeEventWouldCredit("pending"), false);
  assert.equal(storeEventWouldCredit("failed"), false);
  assert.equal(storeIdempotencyKey("ios", "abc"), "ios:abc");
});

test("native purchase and restore stay closed; iyzico native block remains", async () => {
  const buy = await purchaseNativePackage("monthly");
  const restore = await restoreNativePurchases();
  assert.equal(buy.ok, false);
  assert.equal(buy.credited, false);
  assert.equal(restore.ok, false);
  const renew = handleNativeStoreEvent("renew", "yearly", "ios", "tx");
  assert.equal(renew.credited, false);
  assert.ok(STORE_ACCOUNT_TODOS.length >= 8);
  const payments = readFileSync("src/lib/zunoza/payments.ts", "utf8");
  assert.match(payments, /assertWebIyzicoChannel/);
  assert.match(payments, /completeStorePurchase/);
  assert.doesNotMatch(payments.split("completeStorePurchase")[1]!.slice(0, 1600), /chargeCredits|settlePayment|grantCredits/);
  const iyzico = readFileSync("src/lib/zunoza/iyzico.server.ts", "utf8");
  assert.match(iyzico, /initializeCheckoutForm/);
});
