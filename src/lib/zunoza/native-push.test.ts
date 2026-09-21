import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("push stays off without APNs/FCM credentials and never embeds secrets", () => {
  const src = readFileSync("src/lib/zunoza/native-push.ts", "utf8");
  const android = readFileSync("android/app/src/main/AndroidManifest.xml", "utf8");
  const ios = readFileSync("ios/App/App/Info.plist", "utf8");
  const shell = readFileSync("src/lib/zunoza/native-shell.ts", "utf8");
  const api = readFileSync("src/lib/zunoza/api.ts", "utf8");
  assert.match(src, /NATIVE_PUSH_READY/);
  assert.match(src, /APNS_KEY_ID/);
  assert.match(src, /FCM_SERVER_KEY/);
  assert.match(src, /sent: false/);
  assert.match(src, /reason: "credentials"/);
  assert.match(android, /POST_NOTIFICATIONS/);
  assert.match(ios, /remote-notification/);
  assert.match(shell, /registerNativePush/);
  assert.match(shell, /registerNativePushToken/);
  assert.match(shell, /registration/);
  assert.match(api, /notifyVideoReady/);
  assert.doesNotMatch(android, /-----BEGIN PRIVATE KEY-----/);
  assert.doesNotMatch(src, /AAAA[A-Za-z0-9_-]{80,}/);
});

test("video-ready notify is wired but does not credit or invent a send", () => {
  const src = readFileSync("src/lib/zunoza/native-push.ts", "utf8");
  assert.match(src, /export async function notifyVideoReady/);
  assert.doesNotMatch(src, /fetch\("https:\/\/fcm\.googleapis\.com/);
  assert.doesNotMatch(src, /api\.push\.apple\.com/);
});
