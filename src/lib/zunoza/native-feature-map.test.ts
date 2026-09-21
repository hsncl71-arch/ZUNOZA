import assert from "node:assert/strict";
import test from "node:test";
import { NATIVE_PRODUCT_FEATURES, nativeDeepLinkPath, nativeProductPaths } from "./native-feature-map.ts";
import { pathFromNativeUrl } from "./native-shell.ts";

const REQUIRED = [
  "/",
  "/asistan",
  "/olustur",
  "/gorsel",
  "/muzik",
  "/seslendirme",
  "/storyboard",
  "/kapak",
  "/anilar",
  "/montaj",
  "/insa-et",
  "/senaryo",
  "/projeler",
  "/videolarim",
  "/profil",
  "/login",
  "/giris-donus",
  "/paketler",
  "/kredilerim",
  "/ayarlar",
  "/verilerim",
  "/yonetici",
  "/gizlilik",
  "/kvkk-aydinlatma",
];

test("every required ZUNOZA surface is in the native transfer map", () => {
  const paths = new Set(nativeProductPaths());
  for (const path of REQUIRED) assert.equal(paths.has(path), true, path);
  assert.ok(NATIVE_PRODUCT_FEATURES.length >= REQUIRED.length);
});

test("native deep links open every transferred product path inside the app", () => {
  for (const path of nativeProductPaths()) {
    const clean = path.replace(/\/ornek$/, "/abc");
    if (clean === "/") {
      assert.equal(pathFromNativeUrl("https://lunar-sapphire-honey-able.grok.me/"), "/");
      continue;
    }
    const url = `zunoza://${clean.replace(/^\//, "")}`;
    assert.equal(pathFromNativeUrl(url), nativeDeepLinkPath(clean), url);
  }
});

test("ask, video and montage keep microphone/camera/files on native", () => {
  const ask = NATIVE_PRODUCT_FEATURES.find((row) => row.id === "ask");
  const video = NATIVE_PRODUCT_FEATURES.find((row) => row.id === "video");
  const montage = NATIVE_PRODUCT_FEATURES.find((row) => row.id === "montage-editor");
  assert.ok(ask?.capabilities.includes("microphone"));
  assert.ok(video?.capabilities.includes("gallery"));
  assert.ok(montage?.capabilities.includes("share"));
});
