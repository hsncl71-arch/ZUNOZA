import assert from "node:assert/strict";
import test from "node:test";
import {
  buildImageEditBody,
  buildImageGenerateBody,
  clampImageAspect,
  clampImageCount,
  parseImageDataUrl,
  sniffImageMime,
} from "./image-request.ts";

const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, ...Array.from({ length: 40 }, () => 1)]);
const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...Array.from({ length: 40 }, () => 2)]);

test("aspect and batch stay on official xAI values", () => {
  assert.equal(clampImageAspect("9:16"), "9:16");
  assert.equal(clampImageAspect("21:9"), "21:9");
  assert.equal(clampImageAspect("4:5"), "1:1");
  assert.equal(clampImageCount(0), 1);
  assert.equal(clampImageCount(4), 4);
  assert.equal(clampImageCount(99), 10);
});

test("generate body uses official fields only", () => {
  const body = buildImageGenerateBody({
    prompt: "beyaz mermer masada türk kahvesi",
    aspect: "9:16",
    n: 2,
    resolution: "2k",
    model: "grok-imagine-image-2.0",
  });
  assert.equal(body.model, "grok-imagine-image-2.0");
  assert.equal(body.n, 2);
  assert.equal(body.aspect_ratio, "9:16");
  assert.equal(body.resolution, "2k");
  assert.equal("quality" in body, false);
});

test("edit uses image for one source and images for multi-reference", () => {
  const one = `data:image/jpeg;base64,${jpeg.toString("base64")}`;
  const two = `data:image/png;base64,${png.toString("base64")}`;
  const single = buildImageEditBody({
    prompt: "arka planı değiştir, ürünü koru",
    images: [one],
    aspect: "9:16",
    model: "grok-imagine-image-2.0",
  });
  assert.deepEqual(single.image, { url: one, type: "image_url" });
  assert.equal("images" in single, false);
  const multi = buildImageEditBody({
    prompt: "bu iki referansı birleştir",
    images: [one, two],
    model: "grok-imagine-image-2.0",
  });
  assert.equal(Array.isArray(multi.images), true);
  assert.equal((multi.images as unknown[]).length, 2);
  assert.equal("image" in multi, false);
});

test("rejects svg and truncated payloads", () => {
  assert.equal(sniffImageMime(jpeg), "image/jpeg");
  assert.equal(sniffImageMime(png), "image/png");
  assert.equal(parseImageDataUrl("data:image/svg+xml;base64,PHN2Zy8+"), null);
  assert.equal(parseImageDataUrl("data:image/jpeg;base64,QQ=="), null);
});

test("http and off-allowlist image urls are dropped", () => {
  const body = buildImageEditBody({
    prompt: "arka plan",
    images: ["http://127.0.0.1/x", "https://evil.example/x.png"],
    model: "grok-imagine-image-2.0",
  });
  assert.equal("image" in body, false);
  assert.equal("images" in body, false);
});
