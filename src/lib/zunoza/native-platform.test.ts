import assert from "node:assert/strict";
import test from "node:test";
import { nativeStoreFromUserAgent, webIyzicoAllowedFromUserAgent } from "./native-platform.ts";
import { nativeBackShouldNavigate, pathFromNativeUrl } from "./native-shell.ts";

test("web browsers keep iyzico", () => {
  assert.equal(nativeStoreFromUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)"), null);
  assert.equal(webIyzicoAllowedFromUserAgent("Mozilla/5.0 (Linux; Android 14)"), true);
});

test("native UA is iOS or Android and blocks web iyzico", () => {
  const ios = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) ZUNOZANative/1";
  const android = "Mozilla/5.0 (Linux; Android 14; Pixel) AppleWebKit/537.36 ZUNOZANative/1";
  assert.equal(nativeStoreFromUserAgent(ios), "ios");
  assert.equal(nativeStoreFromUserAgent(android), "android");
  assert.equal(webIyzicoAllowedFromUserAgent(ios), false);
  assert.equal(webIyzicoAllowedFromUserAgent(android), false);
});

test("native deep links stay inside the app", () => {
  assert.equal(pathFromNativeUrl("zunoza://giris-donus"), "/giris-donus");
  assert.equal(pathFromNativeUrl("app.zunoza.mobile://login"), "/login");
  assert.equal(pathFromNativeUrl("com.zunoza.app://login"), "/login");
  assert.equal(pathFromNativeUrl("https://lunar-sapphire-honey-able.grok.me/paketler"), "/paketler");
});

test("hostile deep links cannot leave the app", () => {
  assert.equal(pathFromNativeUrl("https://evil.example/paketler"), "/");
  assert.equal(pathFromNativeUrl("http://lunar-sapphire-honey-able.grok.me/login"), "/");
  assert.equal(pathFromNativeUrl("https://lunar-sapphire-honey-able.grok.me/?path=//evil.example"), "/");
  assert.equal(pathFromNativeUrl("zunoza://open?path=//evil.example/steal"), "/");
  assert.equal(pathFromNativeUrl("javascript:alert(1)"), "/");
});

test("Android back goes back only when the native stack can", () => {
  assert.equal(nativeBackShouldNavigate(true), true);
  assert.equal(nativeBackShouldNavigate(false), false);
});
