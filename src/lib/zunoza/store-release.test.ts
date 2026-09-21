import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { STORE_BILLING_READY } from "./store-billing.ts";
import {
  STORE_ACCOUNT_BLOCKERS,
  STORE_APP_ID,
  STORE_APP_NAME,
  STORE_IOS_APP_NAME,
  STORE_IOS_BUNDLE_ID,
  STORE_RELEASE_READY,
  STORE_VERSION_CODE,
  STORE_VERSION_NAME,
} from "./store-release.ts";

test("iOS and Android store identity is ZUNOZA 1.0 without a fake team or keystore", () => {
  const gradle = readFileSync("android/app/build.gradle", "utf8");
  const plist = readFileSync("ios/App/App/Info.plist", "utf8");
  const pbx = readFileSync("ios/App/App.xcodeproj/project.pbxproj", "utf8");
  const example = readFileSync("android/keystore.properties.example", "utf8");
  const exportPlist = readFileSync("ios/ExportOptions.example.plist", "utf8");
  const manifest = readFileSync("android/app/src/main/AndroidManifest.xml", "utf8");
  assert.equal(STORE_APP_ID, "app.zunoza.mobile");
  assert.equal(STORE_IOS_BUNDLE_ID, "com.zunoza.app");
  assert.equal(STORE_APP_NAME, "ZUNOZA");
  assert.equal(STORE_IOS_APP_NAME, "ZUNOZA AI VIDEO");
  assert.equal(STORE_VERSION_NAME, "1.0");
  assert.equal(STORE_VERSION_CODE, 1);
  assert.match(gradle, /applicationId "app\.zunoza\.mobile"/);
  assert.match(gradle, /versionName "1.0"/);
  assert.match(gradle, /keystore\.properties/);
  assert.match(plist, /ZUNOZA AI VIDEO/);
  assert.match(plist, /arm64/);
  assert.doesNotMatch(plist, /armv7/);
  assert.match(pbx, /PRODUCT_BUNDLE_IDENTIFIER = com\.zunoza\.app/);
  assert.doesNotMatch(pbx, /PRODUCT_BUNDLE_IDENTIFIER = app\.zunoza\.mobile/);
  assert.match(pbx, /MARKETING_VERSION = 1.0/);
  assert.doesNotMatch(pbx, /DEVELOPMENT_TEAM = [A-Z0-9]{10}/);
  assert.match(example, /PATH_TO_UPLOAD_KEYSTORE/);
  assert.match(exportPlist, /APPLE_TEAM_ID_TODO/);
  assert.match(manifest, /autoVerify/);
  assert.match(manifest, /com.android.vending.BILLING/);
  assert.match(gradle, /com\.android\.billingclient:billing/);
  assert.match(readFileSync("android/app/src/main/java/app/zunoza/mobile/MainActivity.java", "utf8"), /ZunozaBillingPlugin/);
  assert.match(readFileSync("ios/App/App/ZunozaBillingPlugin.swift", "utf8"), /StoreKit/);
  assert.match(manifest, /enableOnBackInvokedCallback/);
  assert.doesNotMatch(readFileSync("android/app/src/main/res/xml/file_paths.xml", "utf8"), /external-path name="external"/);
  assert.match(readFileSync("android/app/proguard-rules.pro", "utf8"), /com\.getcapacitor/);
  assert.match(gradle, /useLegacyPackaging false/);
  assert.match(readFileSync("ios/App/App/PrivacyInfo.xcprivacy", "utf8"), /PhotosorVideos/);
  assert.match(pbx, /CODE_SIGN_IDENTITY = "Apple Development"/);
  assert.doesNotMatch(pbx, /iPhone Developer/);
  assert.ok(STORE_RELEASE_READY.includes("arm64"));
});

test("store billing stays off and account blockers are explicit", () => {
  assert.equal(STORE_BILLING_READY, false);
  assert.ok(STORE_ACCOUNT_BLOCKERS.length >= 8);
});
