import assert from "node:assert/strict";
import test from "node:test";
import {
  assertProductVideoDuration,
  buildXaiVideoBody,
  clampXaiAspect,
  imagineDuration,
  normalizeVoiceMode,
  wantsSilentAudio,
  voicePromptSuffix,
  xaiResolution,
} from "./video-request.ts";

test("only official xAI aspect ratios are sent", () => {
  assert.equal(clampXaiAspect("9:16"), "9:16");
  assert.equal(clampXaiAspect("16:9"), "16:9");
  assert.equal(clampXaiAspect("1:1"), "1:1");
  assert.equal(clampXaiAspect("4:5"), "3:4");
  assert.equal(clampXaiAspect("21:9"), "16:9");
  assert.equal(clampXaiAspect("nope"), "9:16");
});

test("ekonomik is 480p, ultra 1080p except reference-to-video", () => {
  assert.equal(xaiResolution("ekonomik", "t2v"), "480p");
  assert.equal(xaiResolution("standart", "t2v"), "720p");
  assert.equal(xaiResolution("hd", "i2v"), "720p");
  assert.equal(xaiResolution("ultra", "t2v"), "1080p");
  assert.equal(xaiResolution("ultra", "i2v"), "1080p");
  assert.equal(xaiResolution("ultra", "r2v"), "720p");
});

test("imagine duration only offers 5, 10, or 15 seconds", () => {
  assert.equal(imagineDuration(5), 5);
  assert.equal(imagineDuration(10), 10);
  assert.equal(imagineDuration(15), 15);
  assert.equal(imagineDuration(30), 15);
  assert.equal(imagineDuration(99), 15);
});

test("product API rejects 30 second video instead of stitching two clips", () => {
  assert.equal(assertProductVideoDuration(5), 5);
  assert.equal(assertProductVideoDuration(10), 10);
  assert.equal(assertProductVideoDuration(15), 15);
  assert.throws(() => assertProductVideoDuration(30), /yalnızca 5, 10 veya 15/);
  assert.throws(() => assertProductVideoDuration(20), /yalnızca 5, 10 veya 15/);
});

test("voice aliases: dogal is ambient, tts is spoken, only sessiz is silent", () => {
  assert.equal(normalizeVoiceMode("sessiz"), "sessiz");
  assert.equal(normalizeVoiceMode("ortam"), "ortam");
  assert.equal(normalizeVoiceMode("dogal"), "ortam");
  assert.equal(normalizeVoiceMode("muzik"), "ortam");
  assert.equal(normalizeVoiceMode("konusma"), "konusma");
  assert.equal(normalizeVoiceMode("tts"), "konusma");
  assert.equal(normalizeVoiceMode("ozel"), "ozel");
  assert.equal(wantsSilentAudio("sessiz"), true);
  assert.equal(wantsSilentAudio("ortam"), false);
  assert.equal(wantsSilentAudio("dogal"), false);
  assert.equal(wantsSilentAudio("ozel"), false);
});

test("silent video uses generate_audio false", () => {
  const silent = buildXaiVideoBody({
    prompt: "sessiz gece",
    durationSeconds: 15,
    aspect: "9:16",
    quality: "ekonomik",
    voiceMode: "sessiz",
  });
  assert.equal(silent.body.generate_audio, false);
  assert.equal(silent.body.aspect_ratio, "9:16");
  assert.equal(silent.body.resolution, "480p");
  assert.equal(silent.body.duration, 15);
  const ambient = buildXaiVideoBody({
    prompt: "yağmurlu gece",
    durationSeconds: 10,
    aspect: "16:9",
    quality: "ultra",
    voiceMode: "ortam",
  });
  assert.equal("generate_audio" in ambient.body, false);
  assert.equal(ambient.body.resolution, "1080p");
  const legacy = buildXaiVideoBody({
    prompt: "sesli gece",
    durationSeconds: 10,
    aspect: "16:9",
    quality: "ultra",
    voiceMode: "dogal",
  });
  assert.equal("generate_audio" in legacy.body, false);
});

test("image-to-video and reference-to-video bodies", () => {
  const i2v = buildXaiVideoBody({
    prompt: "hareketlendir",
    durationSeconds: 5,
    aspect: "9:16",
    quality: "ultra",
    image: "data:image/jpeg;base64,abc",
  });
  assert.equal(i2v.mode, "i2v");
  assert.deepEqual(i2v.body.image, { url: "data:image/jpeg;base64,abc" });
  assert.equal(i2v.body.resolution, "1080p");

  const r2v = buildXaiVideoBody({
    prompt: "karakteri koru",
    durationSeconds: 8,
    aspect: "1:1",
    quality: "ultra",
    referenceImages: ["data:image/jpeg;base64,aaa", "data:image/png;base64,bbb"],
    lastFrame: "data:image/jpeg;base64,zzz",
  });
  assert.equal(r2v.mode, "r2v");
  assert.equal(r2v.body.resolution, "720p");
  assert.equal((r2v.body.reference_images as { url: string }[]).length, 2);
  assert.deepEqual(r2v.body.last_frame, { url: "data:image/jpeg;base64,zzz" });
});

test("spoken prompt suffix uses the language catalog and never invents a REST language field", () => {
  assert.match(voicePromptSuffix({ voiceMode: "konusma", language: "tr" }), /Türkçe/);
  assert.match(voicePromptSuffix({ voiceMode: "konusma", language: "hi" }), /Hindi/);
  assert.match(voicePromptSuffix({ voiceMode: "konusma", language: "zh-CN" }), /Mandarin Chinese/);
  const body = buildXaiVideoBody({
    prompt: "a narrator walks through Istanbul",
    durationSeconds: 5,
    aspect: "9:16",
    quality: "ekonomik",
    voiceMode: "konusma",
  });
  assert.equal("language" in body.body, false);
});
