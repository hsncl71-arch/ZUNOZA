import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  NATIVE_FORBIDDEN_PERMISSIONS,
  NATIVE_INTEGRATIONS,
  NATIVE_PERMISSIONS_ON_DEMAND,
} from "./native-architecture.ts";

test("required camera/mic/photos permissions exist and unused ones do not", () => {
  const android = readFileSync("android/app/src/main/AndroidManifest.xml", "utf8");
  const ios = readFileSync("ios/App/App/Info.plist", "utf8");
  assert.match(android, /android.permission.CAMERA/);
  assert.match(android, /android.permission.RECORD_AUDIO/);
  assert.match(android, /READ_MEDIA_IMAGES/);
  assert.match(android, /READ_MEDIA_VIDEO/);
  assert.match(android, /POST_NOTIFICATIONS/);
  assert.match(ios, /NSCameraUsageDescription/);
  assert.match(ios, /NSMicrophoneUsageDescription/);
  assert.match(ios, /NSPhotoLibraryUsageDescription/);
  assert.match(ios, /NSPhotoLibraryAddUsageDescription/);
  for (const key of NATIVE_FORBIDDEN_PERMISSIONS) {
    assert.equal(android.includes(key) || ios.includes(key), false, key);
  }
  assert.ok(NATIVE_PERMISSIONS_ON_DEMAND.length >= 4);
});

test("iOS swipe-back and Android lifecycle are wired in native sources", () => {
  const ios = readFileSync("ios/App/App/MainViewController.swift", "utf8");
  const android = readFileSync("android/app/src/main/java/app/zunoza/mobile/MainActivity.java", "utf8");
  const shell = readFileSync("src/lib/zunoza/native-shell.ts", "utf8");
  assert.match(ios, /allowsBackForwardNavigationGestures/);
  assert.match(ios, /isElementFullscreenEnabled/);
  assert.match(android, /onPause/);
  assert.match(android, /setDownloadListener/);
  assert.match(shell, /appStateChange/);
  assert.match(shell, /backButton/);
  assert.match(shell, /registerNativePush/);
});

test("native integration list covers camera through deep links", () => {
  const ids: string[] = NATIVE_INTEGRATIONS.map((row) => row.id);
  for (const id of ["camera", "microphone", "share-sheet", "android-back", "ios-swipe-back", "lifecycle", "deep-link", "push", "billing"]) {
    assert.equal(ids.includes(id), true, id);
  }
});
