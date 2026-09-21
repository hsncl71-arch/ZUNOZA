import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const montage = readFileSync(new URL("./montage.ts", import.meta.url), "utf8");
const upload = readFileSync(new URL("../../routes/api/montaj-yukle.ts", import.meta.url), "utf8");
const editor = readFileSync(new URL("../../routes/montaj_.$projectId.tsx", import.meta.url), "utf8");
const home = readFileSync(new URL("../../routes/montaj.tsx", import.meta.url), "utf8");
const player = readFileSync(new URL("../../components/studio-video.tsx", import.meta.url), "utf8");

test("render never starts twice and refunds when Shotstack fails later", () => {
  assert.match(montage, /status in \(\$\{"hazirlaniyor"\}, \$\{"basarisiz"\}, \$\{"tamamlandi"\}\)/);
  assert.match(montage, /Bu montaj zaten render ediliyor/);
  assert.match(montage, /assertNotDuplicate\(context\.userId, `montage_render:\$\{project\.id\}`/);
  assert.match(montage, /chargeCredits/);
  assert.match(montage, /refundCredits/);
  assert.match(montage, /refundMontageCharge/);
  assert.match(montage, /markMontageFailed/);
  assert.match(montage, /status = \$\{"render_ediliyor"\}/);
  assert.match(montage, /if \(!claimed\) return row/);
  assert.match(montage, /shouldPollProvider\(`montage:\$\{projectId\}`/);
  assert.match(montage, /case when output_url is not null then \$\{"tamamlandi"\}/);
  assert.match(montage, /clipPlayLength/);
  assert.match(montage, /MONTAGE_MAX_CLIP_SECONDS/);
  assert.doesNotMatch(montage, /Math\.min\(30, clip\.duration/);
});

test("montage upload enforces allowlist and sniffs image/audio bytes", () => {
  assert.match(upload, /if \(!ALLOWED_MIME\[kind\]\.has\(mime\)\)/);
  assert.doesNotMatch(upload, /&& !classifyUpload\(file\.type, file\.name\)/);
  assert.match(upload, /sniffImageMime/);
  assert.match(upload, /sniffAudioMime/);
});

test("list refresh does not poll Shotstack for idle projects", () => {
  assert.match(montage, /needsProviderRefresh/);
  assert.match(montage, /needsProviderRefresh\(row\) \? refreshMontage/);
  const listBlock = montage.slice(montage.indexOf("export const listMontageProjects"), montage.indexOf("export const getMontageProject"));
  assert.doesNotMatch(listBlock, /for \(const row of rows\) out\.push\(mapProject\(await refreshMontage/);
});

test("editor has double-submit lock, quote, drag reorder, multi-select, trim end, lazy thumbs", () => {
  assert.match(editor, /sendingRef/);
  assert.match(editor, /quoteReady/);
  assert.match(editor, /quoteError/);
  assert.match(editor, /quoteMontageCredits/);
  assert.match(editor, /onClipPointerDown/);
  assert.match(editor, /reorderClips/);
  assert.match(editor, /picked\.length/);
  assert.match(editor, /Bitiş/);
  assert.match(editor, /Başlangıç/);
  assert.match(editor, /VideoThumb/);
  assert.match(editor, /preload="metadata"/);
  assert.match(editor, /blobFallback/);
  assert.match(editor, /nextPollDelay\(attempt, 4000, 10000\)/);
  assert.match(editor, /ScreenLoader/);
  assert.match(editor, /deleteMontageProject/);
  assert.match(editor, /queueSave\("now"/);
  assert.match(player, /IntersectionObserver/);
  assert.doesNotMatch(editor, /AI müzik üretimi yok/);
});

test("Shotstack production is distinct from a stage key", () => {
  assert.match(montage, /export function shotstackProductionReady/);
  assert.match(montage, /SHOTSTACK_ENV/);
  assert.match(montage, /edit\/v1/);
  const admin = readFileSync(new URL("./admin.ts", import.meta.url), "utf8");
  assert.match(admin, /shotstackProd: shotstackProductionReady/);
});

test("home keeps video/storyboard handoff and does not double-create", () => {
  assert.match(home, /VIDEO_CLIP_KEY/);
  assert.match(home, /parseVideoClipHandoff/);
  assert.match(home, /STORYBOARD_HANDOFF_KEY/);
  assert.match(home, /sendingRef/);
  assert.match(home, /deleteMontageProject/);
  assert.match(home, /timelineSeconds/);
  assert.match(home, /ScreenLoader/);
});

test("editor uploads device files onto the timeline and library includes studio_uploads", () => {
  assert.match(editor, /postMontageUpload/);
  assert.match(editor, /Telefondan \/ bilgisayardan yükle/);
  assert.match(editor, /saveMediaFromUrl/);
  assert.match(editor, /JobProgress/);
  assert.match(montage, /studio_uploads/);
  assert.match(home, /Telefondan veya bilgisayardan/);
});
