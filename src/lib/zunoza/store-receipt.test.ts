import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { STORE_BILLING_READY } from "./store-billing.ts";
import { appleIapConfigured, googlePlayConfigured, storeBillingConfigured, verifyStoreReceipt } from "./store-receipt.ts";

test("store receipt verify stays closed without Apple/Google secrets", async () => {
  assert.equal(STORE_BILLING_READY, false);
  assert.equal(appleIapConfigured(), false);
  assert.equal(googlePlayConfigured(), false);
  assert.equal(storeBillingConfigured(), false);
  const apple = await verifyStoreReceipt({
    packageId: "mini",
    platform: "ios",
    transactionId: "tx-fake",
    receipt: "fake",
  });
  assert.equal(apple.ok, false);
  assert.match(apple.message, /Kredi yüklenmedi/);
  const play = await verifyStoreReceipt({
    packageId: "mini",
    platform: "android",
    transactionId: "token-fake",
    receipt: "{}",
  });
  assert.equal(play.ok, false);
  assert.match(play.message, /Kredi yüklenmedi/);
});

test("native billing plugins exist and Play Billing permission is declared", () => {
  const java = readFileSync("android/app/src/main/java/app/zunoza/mobile/ZunozaBillingPlugin.java", "utf8");
  const main = readFileSync("android/app/src/main/java/app/zunoza/mobile/MainActivity.java", "utf8");
  const gradle = readFileSync("android/app/build.gradle", "utf8");
  const swift = readFileSync("ios/App/App/ZunozaBillingPlugin.swift", "utf8");
  const pbx = readFileSync("ios/App/App.xcodeproj/project.pbxproj", "utf8");
  assert.match(java, /@CapacitorPlugin\(name = "ZunozaBilling"\)/);
  assert.match(main, /registerPlugin\(ZunozaBillingPlugin\.class\)/);
  assert.match(gradle, /com\.android\.billingclient:billing/);
  assert.match(swift, /jsName = "ZunozaBilling"/);
  assert.match(swift, /Product\.products/);
  assert.match(pbx, /ZunozaBillingPlugin.swift in Sources/);
  assert.match(readFileSync("src/lib/zunoza/payments.ts", "utf8"), /applyVerifiedStoreTransaction/);
  assert.match(readFileSync("src/lib/zunoza/store-fulfill.ts", "utf8"), /store_transactions/);
  assert.doesNotMatch(readFileSync("src/lib/zunoza/store-fulfill.ts", "utf8"), /chargeCredits|grantCredits/);
});
