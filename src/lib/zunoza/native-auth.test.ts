import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  isolateNativeUserCache,
  nativeAuthHasEmbeddedSecret,
  NATIVE_AUTH_BACKEND,
  NATIVE_AUTH_SESSION,
  NATIVE_USER_SCOPED,
} from "./native-auth.ts";

test("mobile uses the same Better Auth cookie session, not a second database", () => {
  assert.equal(NATIVE_AUTH_BACKEND, "/api/auth");
  assert.equal(NATIVE_AUTH_SESSION, "http-only-cookie");
  for (const key of ["profile", "credits", "projects", "videos", "memories"]) {
    assert.equal(NATIVE_USER_SCOPED.includes(key as (typeof NATIVE_USER_SCOPED)[number]), true, key);
  }
});

test("switching accounts on the device clears the previous user marker", () => {
  const mem = new Map<string, string>();
  const storage = {
    getItem: (k: string) => mem.get(k) ?? null,
    setItem: (k: string, v: string) => void mem.set(k, v),
    removeItem: (k: string) => void mem.delete(k),
  };
  assert.equal(isolateNativeUserCache("user-a", storage).switched, false);
  assert.equal(isolateNativeUserCache("user-b", storage).switched, true);
  assert.equal(isolateNativeUserCache(null, storage).switched, true);
  assert.equal(isolateNativeUserCache("user-c", storage).switched, false);
});

test("native configs do not embed API keys or payment secrets", () => {
  const files = [
    "capacitor.config.ts",
    "android/app/src/main/assets/capacitor.config.json",
    "android/app/src/main/java/app/zunoza/mobile/MainActivity.java",
    "ios/App/App/Info.plist",
    "native/www/index.html",
  ];
  for (const file of files) {
    const text = readFileSync(file, "utf8");
    assert.equal(nativeAuthHasEmbeddedSecret(text), false, file);
  }
});

test("Android flushes cookies so the session survives app backgrounding", () => {
  const java = readFileSync("android/app/src/main/java/app/zunoza/mobile/MainActivity.java", "utf8");
  assert.match(java, /CookieManager/);
  assert.match(java, /\.flush\(/);
});
