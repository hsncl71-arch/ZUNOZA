import assert from "node:assert/strict";
import test from "node:test";
import { parseVideoDirection, planVideoPrompt } from "./video-plan.ts";

test("spoken mode folds language into the planner; ambient does not", () => {
  const spoken = planVideoPrompt("Sahilde gün batımı, yavaş kamera", {
    durationSeconds: 5,
    aspect: "9:16",
    quality: "ekonomik",
    negativePrompt: "bulanık, yazı, filigran",
    language: "tr",
    voiceMode: "konusma",
  });
  assert.equal(spoken.duration, 5);
  assert.equal(spoken.aspect, "9:16");
  assert.match(spoken.prompt, /Avoid: bulanık, yazı, filigran/);
  assert.match(spoken.prompt, /Türkçe/);
  assert.equal(spoken.generateAudio, true);
  assert.equal(spoken.direction.camera, "slow");
  assert.equal(spoken.direction.lighting, "golden");

  const ambient = planVideoPrompt("Sahilde gün batımı, yavaş kamera", {
    durationSeconds: 5,
    aspect: "9:16",
    quality: "ekonomik",
    language: "tr",
    voiceMode: "ortam",
  });
  assert.doesNotMatch(ambient.prompt, /Konuşma varsa Türkçe|Any speech/);
  assert.match(ambient.prompt, /ortam sesleri|SFX/i);
  assert.match(ambient.prompt, /konuşması|No human speech/i);
  assert.equal(ambient.generateAudio, true);
});

test("legacy dogal maps to ambient and never invites dialogue", () => {
  const plan = planVideoPrompt("Elektrikler gitti, karanlık oda", {
    durationSeconds: 10,
    aspect: "16:9",
    quality: "hd",
    language: "tr",
    voiceMode: "dogal",
  });
  assert.equal(plan.voice, "ortam");
  assert.doesNotMatch(plan.prompt, /Konuşma varsa Türkçe/);
  assert.match(plan.prompt, /İnsan konuşması|No human speech/);
});

test("silent videos skip speech-language hint and forbid all audio", () => {
  const plan = planVideoPrompt("Sessiz gece ormanı", {
    durationSeconds: 10,
    aspect: "16:9",
    quality: "hd",
    language: "en",
    voiceMode: "sessiz",
  });
  assert.equal(plan.generateAudio, false);
  assert.doesNotMatch(plan.prompt, /English|Türkçe olsun/);
  assert.match(plan.prompt, /Sessiz video/);
});

test("custom sound instruction is appended without auto speech language", () => {
  const plan = planVideoPrompt("Ormanda gece, çadır ışığı", {
    durationSeconds: 15,
    aspect: "9:16",
    quality: "standart",
    language: "tr",
    voiceMode: "ozel",
    voiceInstruction: "Konuşma olmasın; yalnızca yağmur, rüzgâr ve uzaktan gök gürültüsü duyulsun.",
  });
  assert.equal(plan.generateAudio, true);
  assert.match(plan.prompt, /Ses talimatı: Konuşma olmasın/);
  assert.doesNotMatch(plan.prompt, /Konuşma varsa Türkçe/);
  assert.equal(plan.direction.lighting, "practical");
});

test("durations above 15 clamp to 15 and 30 is not a product length", () => {
  const plan = planVideoPrompt("Uzun yol çekimi", {
    durationSeconds: 30,
    aspect: "16:9",
    quality: "standart",
    voiceMode: "ortam",
  });
  assert.equal(plan.duration, 15);
});

test("image-to-video keeps identity instruction", () => {
  const plan = planVideoPrompt("Bu portreyi hareketlendir", {
    durationSeconds: 5,
    aspect: "1:1",
    quality: "ultra",
    image: "data:image/jpeg;base64,abc",
  });
  assert.equal(plan.mode, "i2v");
  assert.equal(plan.resolution, "1080p");
  assert.match(plan.prompt, /özneyi koru/i);
  assert.match(plan.prompt, /identity|clothing|consistent/i);
});

test("spoken Japanese and Persian fold into the planner from the catalog", () => {
  const ja = planVideoPrompt("Tokyo night street", {
    durationSeconds: 5,
    aspect: "9:16",
    quality: "ekonomik",
    language: "ja",
    voiceMode: "konusma",
  });
  assert.match(ja.prompt, /Japanese/);
  assert.equal(ja.generateAudio, true);

  const fa = planVideoPrompt("Tahran çarşısı", {
    durationSeconds: 10,
    aspect: "16:9",
    quality: "hd",
    language: "fa",
    voiceMode: "konusma",
  });
  assert.match(fa.prompt, /Persian/);
});

test("director parses camera, light, vfx and last-frame without a second model", () => {
  const parsed = parseVideoDirection("Karakteri koru, etrafında dön, neon yağmur, a
... 