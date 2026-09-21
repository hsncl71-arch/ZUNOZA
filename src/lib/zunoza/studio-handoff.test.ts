import assert from "node:assert/strict";
import test from "node:test";
import {
  clampStudioDuration,
  musicQuoteLabel,
  displayVideoModel,
  parseAudioHandoff,
  parseJobMediaHandoff,
  parseMusicHandoff,
  parseStoryboardHandoff,
  parseVideoClipHandoff,
  parseVideoRetry,
  promptKeyForAction,
  providerWaitCopy,
  videoProgressCopy,
  videoQuoteLabel,
  creditSpendCopy,
} from "./studio-handoff.ts";

test("retry payload rejects short prompts and clamps duration/quality", () => {
  assert.equal(parseVideoRetry({ prompt: "kısa" }), null);
  const ok = parseVideoRetry({
    prompt: "Kapadokya’da şafak vakti balonlar yükseliyor",
    durationSeconds: 15,
    aspect: "9:16",
    quality: "hd",
    voiceMode: "sessiz",
    language: "tr",
    sourceKind: "gorsel",
    negativePrompt: "yazı",
  });
  assert.equal(ok?.durationSeconds, 15);
  assert.equal(ok?.quality, "hd");
  assert.equal(ok?.sourceKind, "gorsel");
  assert.equal(ok?.negativePrompt, "yazı");
  assert.equal(parseVideoRetry({ prompt: "yeterince uzun bir sahne anlatımı", quality: "4k" })?.quality, "ekonomik");
  assert.equal(clampStudioDuration(30), 15);
  assert.equal(clampStudioDuration(99), 5);
  assert.equal(clampStudioDuration(15), 15);
});

test("quote label never treats a failed quote as free/demo", () => {
  assert.match(
    videoQuoteLabel({ quoteReady: false, quoteError: false, demo: true, unlimited: false, duration: 5, credits: 0 }),
    /hesaplanıyor/,
  );
  assert.match(
    videoQuoteLabel({ quoteReady: false, quoteError: true, demo: true, unlimited: false, duration: 5, credits: 0 }),
    /hesaplanamadı/,
  );
  assert.match(
    videoQuoteLabel({ quoteReady: true, quoteError: false, demo: false, unlimited: false, duration: 15, credits: 18 }),
    /18 kredi/,
  );
  assert.match(
    videoQuoteLabel({ quoteReady: true, quoteError: false, demo: false, unlimited: false, duration: 10, credits: 10, quality: "standart" }),
    /10 sn · Standart video 10 kredi/,
  );
  assert.match(
    videoQuoteLabel({ quoteReady: true, quoteError: false, demo: false, unlimited: false, duration: 15, credits: 15, quality: "standart", balance: 24 }),
    /15 sn · Standart video 15 kredi kullanır. Paketinizde 24 kredi kaldı/,
  );
  assert.doesNotMatch(
    videoQuoteLabel({ quoteReady: false, quoteError: true, demo: true, unlimited: false, duration: 5, credits: 0 }),
    /demo/,
  );
});

test("progress copy stays running until done/fail and exposes real stages", () => {
  const created = new Date(Date.now() - 65_000).toISOString();
  const running = videoProgressCopy("modele_gonderildi", created);
  assert.equal(running.running, true);
  assert.equal(running.elapsedLabel, "1:05");
  assert.equal(running.hint, "Video oluşturuluyor");
  assert.equal(running.current, 1);
  assert.equal(running.pct, null);
  assert.deepEqual(running.stages, [
    "Görsel hazırlanıyor",
    "Video oluşturuluyor",
    "Son işlemler yapılıyor",
    "Videonuz hazır",
  ]);
  assert.doesNotMatch(running.hint, /Grok|Imagine|Kling|xAI|Shotstack/i);
  assert.equal(videoProgressCopy("hazirlaniyor", created).hint, "Görsel hazırlanıyor");
  assert.equal(videoProgressCopy("hazirlaniyor", created).current, 0);
  assert.equal(videoProgressCopy("hazirlaniyor", created).pct, null);
  assert.equal(videoProgressCopy("olusturuluyor", created).hint, "Video oluşturuluyor");
  assert.equal(videoProgressCopy("tamamlandi", created).running, false);
  assert.equal(videoProgressCopy("tamamlandi", created).hint, "Videonuz hazır");
  assert.equal(videoProgressCopy("tamamlandi", created).pct, 100);
  assert.equal(videoProgressCopy("basarisiz", created).running, false);
  assert.equal(displayVideoModel("Grok Imagine"), "ZUNOZA Video");
  assert.equal(displayVideoModel("grok"), "ZUNOZA Video");
  assert.equal(displayVideoModel("otomatik"), "ZUNOZA Video");
});

test("montage clip handoff requires a job id", () => {
  assert.equal(parseVideoClipHandoff({ title: "x" }), null);
  const clip = parseVideoClipHandoff({ jobId: "abc", title: "Sahil", duration: 10, aspect: "16:9" });
  assert.equal(clip?.jobId, "abc");
  assert.equal(clip?.duration, 10);
});

test("music and audio handoff require ids and clip bundle keeps both", () => {
  assert.equal(parseMusicHandoff({ prompt: "x" }), null);
  const music = parseMusicHandoff({ id: "m1", prompt: "Epik trailer", durationSeconds: 30 });
  assert.equal(music?.id, "m1");
  assert.equal(music?.durationSeconds, 30);
  assert.equal(parseAudioHandoff({ text: "merhaba" }), null);
  const audio = parseAudioHandoff({ id: "a1", text: "Merhaba ZUNOZA", voiceId: "eve" });
  assert.equal(audio?.voiceId, "eve");
  const board = parseStoryboardHandoff({
    storyboardId: "sb1",
    musicId: "m1",
    audioId: "a1",
    title: "Klip",
  });
  assert.equal(board?.musicId, "m1");
  assert.equal(board?.audioId, "a1");
});

test("music quote never treats a failed catalog as free", () => {
  assert.match(
    musicQuoteLabel({ quoteReady: false, quoteError: true, unlimited: false, credits: 0, kind: "music" }),
    /hesaplanamadı/,
  );
  assert.doesNotMatch(
    musicQuoteLabel({ quoteReady: false, quoteError: true, unlimited: false, credits: 0, kind: "voice" }),
    /kredi düşmez/,
  );
  assert.match(
    musicQuoteLabel({ quoteReady: true, quoteError: false, unlimited: false, credits: 4, kind: "music" }),
    /4 kredi/,
  );
  assert.match(
    musicQuoteLabel({ quoteReady: true, quoteError: false, unlimited: true, credits: 21, kind: "voice" }),
    /Sahip/,
  );
});

test("spend copy shows remaining balance after a production", () => {
  assert.equal(creditSpendCopy({ spent: 15, remaining: 9 }), "15 kredi kullanıldı — 9 krediniz kaldı.");
  assert.match(creditSpendCopy({ spent: 15, remaining: 9, unlimited: true }), /kredi düşmedi/);
});

test("module prompt keys stay isolated by destination", () => {
  assert.equal(promptKeyForAction("video"), "zunoza.olusturPrompt");
  assert.equal(promptKeyForAction("storyboard"), "zunoza.clipPrompt");
  assert.equal(promptKeyForAction("voice"), "zunoza.voicePrompt");
  assert.equal(promptKeyForAction("image"), "zunoza.gorselPrompt");
  assert.equal(promptKeyForAction("social"), "zunoza.socialPrompt");
  assert.equal(promptKeyForAction("montage"), null);
});

test("provider wait copy never invents a fake percent", () => {
  const wait = providerWaitCopy("music", Date.now() - 12_000);
  assert.equal(wait.running, true);
  assert.equal(wait.current, 1);
  assert.equal(wait.pct, null);
  assert.match(wait.hint, /Müzik oluşturuluyor/);
  const videoWait = providerWaitCopy("video_submit", Date.now());
  assert.equal(videoWait.hint, "Görsel hazırlanıyor");
  assert.equal(videoWait.current, 0);
  assert.equal(videoWait.pct, null);
  assert.deepEqual(videoWait.stages, [
    "Görsel hazırlanıyor",
    "Video oluşturuluyor",
    "Son işlemler yapılıyor",
    "Videonuz hazır",
  ]);
  assert.doesNotMatch(videoWait.hint, /Grok|Imagine|Kling|gönderiliyor/i);
});

test("job media handoff keeps audio and music ids without using them as prompts", () => {
  const parsed = parseJobMediaHandoff({
    audio: { id: "a1", text: "TTS metni klibe yazılmamalı" },
    music: { id: "m1", prompt: "şarkı" },
  });
  assert.equal(parsed?.audio?.id, "a1");
  assert.equal(parsed?.music?.id, "m1");
  assert.equal(parseJobMediaHandoff({}), null);
});
