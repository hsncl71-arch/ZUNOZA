import assert from "node:assert/strict";
import test from "node:test";
import {
  carryForwardImages,
  sanitizeAskImages,
  toAskApiTurns,
  wantsVisionGroundedSearch,
  visionSystemExtra,
} from "./ask-media.ts";

const jpeg = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wAAAAD/AAA=";
const png = "data:image/png;base64,iVBORw0KGgo=";
const webp = "data:image/webp;base64,UklGRg==";

test("sanitizeAskImages keeps jpeg/png data urls and drops the rest", () => {
  assert.deepEqual(sanitizeAskImages([jpeg, png, webp, "https://x.ai/a.png", "not-an-image"]), [jpeg, png]);
  assert.deepEqual(sanitizeAskImages(undefined), []);
  assert.equal(sanitizeAskImages(Array.from({ length: 12 }, () => jpeg)).length, 8);
});

test("carryForwardImages copies the last photo onto a follow-up without a new attachment", () => {
  const rows = carryForwardImages([
    { role: "user", content: "bu nedir", images: [jpeg] },
    { role: "assistant", content: "bir kutu" },
    { role: "user", content: "peki fiyatı ne" },
  ]);
  assert.equal(rows[2]?.images?.[0], jpeg);
  const withNew = carryForwardImages([
    { role: "user", content: "eski", images: [jpeg] },
    { role: "assistant", content: "ok" },
    { role: "user", content: "yeni", images: [png] },
  ]);
  assert.deepEqual(withNew[2]?.images, [png]);
  const stored = carryForwardImages([
    { role: "user", content: "bak", images: ["/api/sor-ekler/abc-1/indir"] },
    { role: "assistant", content: "gördüm" },
    { role: "user", content: "rengi ne" },
  ]);
  assert.equal(stored[2]?.images?.[0], "/api/sor-ekler/abc-1/indir");
});

test("toAskApiTurns sends high-detail image_url parts", () => {
  const turns = toAskApiTurns([{ role: "user", content: "Bu nedir?", images: [jpeg] }]);
  const content = turns[0]?.content;
  assert.equal(Array.isArray(content), true);
  if (!Array.isArray(content)) return;
  assert.equal(content[0]?.type, "text");
  assert.equal(content[1]?.type, "image_url");
  if (content[1]?.type === "image_url") {
    assert.equal(content[1].image_url.url, jpeg);
    assert.equal(content[1].image_url.detail, "high");
  }
});

test("product and medicine questions trigger grounded search after vision", () => {
  assert.equal(wantsVisionGroundedSearch("Bu nedir?"), true);
  assert.equal(wantsVisionGroundedSearch("Bu ilaç ne işe yarar"), true);
  assert.equal(wantsVisionGroundedSearch("kaç mg"), true);
  assert.equal(wantsVisionGroundedSearch("merhaba nasılsın"), false);
  assert.match(visionSystemExtra(), /teşhis veya reçete yazma/);
});
