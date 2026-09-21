import assert from "node:assert/strict";
import test from "node:test";
import { analyzeBuildScope, studioBuildBrief } from "./builder-studio.ts";

test("simple edits stay single-agent; platforms and games recruit a crew", () => {
  const small = analyzeBuildScope("renkleri koyulaştır", true);
  assert.equal(small.scale, "small");
  assert.equal(small.roles.includes("frontend") || small.roles.includes("tasarım"), true);
  assert.match(small.activity[0] || "", /Ek ajan açılmadı/);

  const shop = analyzeBuildScope("Ürün, sepet, üyelik ve iyzico ödemeli bir pazaryeri platformu oluştur.");
  assert.equal(shop.scale, "large");
  assert.ok(shop.roles.includes("mimari"));
  assert.ok(shop.roles.includes("veri"));
  assert.match(shop.activity.join(" "), /koordine/);

  const game = analyzeBuildScope("skor tutan bir uzay oyunu yap");
  assert.equal(game.scale, "large");
  assert.ok(game.roles.includes("oyun"));
  assert.match(studioBuildBrief("skor tutan bir uzay oyunu yap", false), /oynanış/);
  assert.match(studioBuildBrief("renkleri koyulaştır", true), /Küçük iş/);
});
