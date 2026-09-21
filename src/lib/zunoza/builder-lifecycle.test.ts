import assert from "node:assert/strict";
import { mkdirSync, readFileSync } from "node:fs";
import test from "node:test";
import { chromium } from "playwright";
import { evaluateBuilderOutput, isAllowedBuilderPath, mergeBuilderFiles } from "./builder-files.ts";
import { buildPreviewDocument, looksLikeRawMarkup } from "./builder-quality.ts";
import { runFinalQualityGate } from "./builder-gate.ts";
import { inspectExistingApp } from "./builder-loop.ts";

const builder = readFileSync(new URL("./builder.ts", import.meta.url), "utf8");
const start = readFileSync(new URL("../../routes/insa-et.tsx", import.meta.url), "utf8");
const work = readFileSync(new URL("../../routes/insa-et_.$projectId.tsx", import.meta.url), "utf8");
const preview = readFileSync(new URL("../../components/builder-preview.tsx", import.meta.url), "utf8");
const pub = readFileSync(new URL("../../routes/p.$slug.tsx", import.meta.url), "utf8");

function publishSlug(name: string, projectId: string) {
  const base =
    String(name || "uygulama")
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 24) || "uygulama";
  const tail =
    String(projectId || "")
      .replace(/^bp_/, "")
      .replace(/[^a-z0-9]/gi, "")
      .slice(0, 8)
      .toLowerCase() || "pxxxxxxxx";
  return `${base}-${tail}`;
}

test("İnşa Et create/edit/preview/save/rename/copy/delete contracts stay real", () => {
  assert.match(start, /startBuilderProject/);
  assert.match(start, /Yeniden adlandır/);
  assert.match(start, /Çoğalt/);
  assert.match(start, /Projeyi Sil/);
  assert.match(start, /Bu projeyi kalıcı olarak silmek istediğinize emin misiniz\? Bu işlem geri alınamaz/);
  assert.match(start, /confirm: "sil"/);
  assert.match(start, /setPreviewDevice\("phone"\)/);
  assert.match(start, /builder-home-cover/);
  assert.match(work, /saveBuilderProject/);
  assert.match(work, /saveBuilderFile/);
  assert.match(work, /applyBuilderEdit/);
  assert.match(work, /Canlı önizle/);
  assert.match(work, /duplicateHere/);
  assert.match(work, /confirmProjectDelete/);
  assert.match(work, /submitRename/);
  assert.match(work, /publishBuilderProject/);
  assert.match(work, /BuilderPreview/);
  assert.match(work, /formatSelectedEdit/);
  assert.match(work, /İleri Al/);
  assert.match(work, /Bölüm seç/);
  assert.match(work, /builder-live-stage/);
  assert.match(start, /Bugün ne inşa etmek istiyorsunuz/);
  assert.match(start, /data-builder-cat/);
  assert.match(preview, /sandbox="allow-scripts"/);
  assert.match(preview, /frameKey/);
  assert.match(pub, /getPublishedBuilderApp/);
  assert.match(builder, /function publishSlug/);
  assert.match(builder, /assertProjectIdle/);
  assert.equal(isAllowedBuilderPath("index.html"), true);
  assert.equal(isAllowedBuilderPath("../etc/passwd"), false);
  const slug = publishSlug("Atölye Paneli", "bp_abc12345zzzz");
  assert.match(slug, /^atolye-paneli-abc12345$/);
  assert.notEqual(publishSlug("Atölye", "bp_aaa"), publishSlug("Atölye", "bp_bbb"));
});

test("todo create → AI-style incremental edit → preview save stays interactive", { timeout: 60_000 }, async () => {
  const created = evaluateBuilderOutput({}, "Basit bir yapılacaklar listesi oluştur. Görev ekleme, tamamlandı işaretleme ve silme olsun.", {
    kind: "todo",
    name: "Görev Listesi",
  });
  assert.equal(created.ok, true, created.issues.join("; ") || "oluşturma kapısı geçmedi");
  assert.ok(created.html.length > 80);
  assert.equal(looksLikeRawMarkup(created.html, created.html), false);
  const first = inspectExistingApp(created.files, "Arama kutusunun yer tutucusunu 'Görevlerde ara' yap", { kind: "todo" });
  assert.equal(first.incremental, true);
  const edited = { ...created.files };
  if (edited["index.html"]) {
    edited["index.html"] = edited["index.html"].replace(
      /placeholder="[^"]*ara[^"]*"/i,
      'placeholder="Görevlerde ara"',
    );
    if (!/Görevlerde ara/.test(edited["index.html"])) {
      edited["index.html"] = edited["index.html"].replace(
        /placeholder="[^"]+"/,
        'placeholder="Görevlerde ara"',
      );
    }
  }
  const merged = mergeBuilderFiles(created.files, edited);
  const gate = runFinalQualityGate(merged, "Görev listesi", { kind: "todo" });
  assert.equal(gate.ok, true, gate.issues.join("; ") || "düzenleme kapısı geçmedi");
  const previewDoc 
... 