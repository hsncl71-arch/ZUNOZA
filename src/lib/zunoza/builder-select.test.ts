import assert from "node:assert/strict";
import test from "node:test";
import {
  BUILDER_SELECT_EVENT,
  formatSelectedEdit,
  injectBuilderSelectScript,
  parseBuilderSelectMessage,
} from "./builder-select.ts";

test("select messages are parsed and prefixed onto the real edit instruction", () => {
  assert.equal(parseBuilderSelectMessage(null), null);
  assert.equal(parseBuilderSelectMessage({ type: "other", label: "Hero" }), null);
  const hit = parseBuilderSelectMessage({
    type: BUILDER_SELECT_EVENT,
    label: "  Hero alanı  ",
    tag: "SECTION",
    page: "ana",
    text: "Karşılama metni",
  });
  assert.equal(hit?.label, "Hero alanı");
  assert.equal(hit?.tag, "section");
  const text = formatSelectedEdit("Bunu daha premium yap.", hit);
  assert.match(text, /SEÇİLİ BÖLÜM: Hero alanı/);
  assert.match(text, /Bunu daha premium yap/);
  assert.equal(formatSelectedEdit("Renkleri değiştir"), "Renkleri değiştir");
});

test("picker script is injected only into the live preview document", () => {
  const html = injectBuilderSelectScript("<html><body><header>Üst</header></body></html>");
  assert.match(html, /__zunozaPick/);
  assert.match(html, /zunoza-builder-select/);
  assert.match(html, /<\/body>/);
  const again = injectBuilderSelectScript(html);
  assert.equal(again.split("__zunozaPick").length, html.split("__zunozaPick").length);
});
