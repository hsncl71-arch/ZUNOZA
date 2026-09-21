import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const api = readFileSync(new URL("./api.ts", import.meta.url), "utf8");
const images = readFileSync(new URL("./images.ts", import.meta.url), "utf8");
const olustur = readFileSync(new URL("../../routes/olustur.tsx", import.meta.url), "utf8");
const gorsel = readFileSync(new URL("../../routes/gorsel.tsx", import.meta.url), "utf8");
const listPage = readFileSync(new URL("../../routes/videolarim.tsx", import.meta.url), "utf8");
const detail = readFileSync(new URL("../../routes/videolarim_.$jobId.tsx", import.meta.url), "utf8");
const player = readFileSync(new URL("../../components/studio-video.tsx", import.meta.url), "utf8");
const kapak = readFileSync(new URL("../../routes/kapak.tsx", import.meta.url), "utf8");

test("video create has a double-submit lock and never treats a failed quote as free", () => {
  assert.match(olustur, /sendingRef/);
  assert.match(olustur, /quoteReady/);
  assert.match(olustur, /quoteError/);
  assert.doesNotMatch(olustur, /catch \(\) => setQuote\(\{ credits: 0, demo: true/);
  assert.match(olustur, /VIDEO_RETRY_KEY/);
  assert.match(olustur, /Videoyu Oluştur — \$\{quote\.credits\} Kredi/);
  assert.match(olustur, /const DURATIONS = \[5, 10, 15\]/);
  assert.doesNotMatch(olustur, /30 saniye/);
  assert.match(olustur, /Doğal Ortam Sesleri/);
  assert.match(olustur, /Konuşmalı \/ Anlatımlı/);
  assert.match(olustur, /Özel Ses Talimatı/);
  assert.match(olustur, /Metinden Video — AI Video/);
  assert.match(olustur, /Yapay zekâ ile metninizi saniyeler içinde videoya dönüştürün/);
  assert.match(olustur, /VIDEO_SPEECH_LANGUAGES/);
  assert.match(olustur, /Video dili/);
  assert.doesNotMatch(olustur, /option value="az">Azerbaycanca/);
});

test("polling only hits provider status, never a second generation", () => {
  assert.match(api, /shouldPollProvider\(id, 5000\)/);
  assert.match(api, /videos\/\$\{requestId\}/);
  const pollBlock = api.slice(api.indexOf("async function pollXai"), api.indexOf("async function refundJob"));
  assert.match(pollBlock, /v1\/videos\/\$\{requestId\}/);
  assert.doesNotMatch(pollBlock, /videos\/generations/);
  assert.doesNotMatch(pollBlock, /method: "POST"/);
  const startBlock = api.slice(api.indexOf("async function startXaiVideo"), api.indexOf("async function pollXai"));
  assert.match(startBlock, /AbortSignal\.timeout\(90_000\)/);
  assert.match(api, /debitJobCredits/);
  assert.match(api, /if \(cost > 0\)/);
  assert.doesNotMatch(api, /data\.durationSeconds === 30/);
  assert.doesNotMatch(api, /sceneCount = data\.durationSeconds === 30 \? 2/);
  assert.match(api, /assertProductVideoDuration/);
  assert.match(olustur, /zunoza\.lastVideoJob/);
});

test("image list refresh does not call Imagine generate/edit", () => {
  const listBlock = images.slice(images.indexOf("export const listStudioImages"), images.indexOf("export const getStudioImage"));
  assert.doesNotMatch(listBlock, /images\/generations/);
  assert.doesNotMatch(listBlock, /images\/edits/);
  assert.match(images, /chargeCredits/);
  assert.match(gorsel, /sendingRef/);
  assert.match(gorsel, /previews/);
  const editBlock = images.slice(images.indexOf("export const editStudioImage"), images.indexOf("export const listStudioImages"));
  assert.match(editBlock, /images\/edits/);
  assert.doesNotMatch(editBlock, /images\/generations/);
});

test("history has real thumbs, recreate handoff, and montage for single clips", () => {
  assert.match(player, /src\?: string \| null/);
  assert.match(player, /IntersectionObserver/);
  assert.match(listPage, /VideoThumb className="h-full w-full" src=\{j\.videoUrl\}/);
  assert.match(detail, /VIDEO_RETRY_KEY/);
  assert.match(detail, /VIDEO_CLIP_KEY/);
  assert.match(detail, /Yeniden Oluştur/);
  assert.match(detail, /Montaja aktar/);
});

test("end-user video UI never names Grok Imagine, Kling, or a fake stuck percent", () => {
  assert.doesNotMatch(olustur, /Grok Imagine/);
  assert.doesNotMatch(olustur, /Kling/);
  assert.doesNotMatch(olustur, /gönderiliyor/);
  assert.match(olustur, /Fotoğraftan Video — AI Video/);
  assert.match(olustur, /Görsel hazırlanıyor/);
  assert.doesNotMatch(detail, /Imagine/);
  assert.doesNotMatch(detail, /Grok/);
  assert.doesNotMatch(detail, /Model: \{job\.model\}/);
  assert.match(detail, /displayVideoModel\(job\.model\)/);
  assert.doesNotMatch(listPage, /progress\.pct\}%/);
  assert.match(listPage, /typeof progress\.pct === "number"/);
});

test("video quote/charge uses formula fallback and profile counts live package purchases", () => {
  assert.match(api, /videoCreditsFor/);
  assert.doesNotMatch(api, /price\?\.credits \?\? durationSeconds/);
  assert.doesNotMatch(api, /row\?\.credits \?\? sceneSeconds/);
  assert.match(api, /kind = \$\{"paket_satin_al"\}/);
  assert.doesNotMatch(api, /test_satin_al/);
  assert.match(kapak, /sendingRef/);
});
