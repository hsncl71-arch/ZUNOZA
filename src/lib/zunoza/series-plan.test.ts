import assert from "node:assert/strict";
import test from "node:test";
import {
  assertEpisodeSeconds,
  assertSeriesEpisodeSlot,
  bibleLockLine,
  composeScenePrompt,
  fallbackScenes,
  mergeBible,
  parseBible,
  parseSceneDrafts,
  splitEpisodeSeconds,
  MAX_SERIES_EPISODES,
  DEFAULT_EPISODE_SECONDS,
} from "./series-plan.ts";

test("episode splits only into 5/10/15 second shots", () => {
  assert.deepEqual(splitEpisodeSeconds(60), [15, 15, 15, 15]);
  assert.deepEqual(splitEpisodeSeconds(90), [15, 15, 15, 15, 15, 15]);
  assert.equal(splitEpisodeSeconds(300).length, 20);
  assert.equal(splitEpisodeSeconds(300).every((n) => n === 15), true);
  assert.equal(splitEpisodeSeconds(180).reduce((a, b) => a + b, 0), 180);
  assert.equal(DEFAULT_EPISODE_SECONDS, 300);
  assert.throws(() => assertEpisodeSeconds(45), /1, 1.5, 2, 3, 4 veya 5/);
  assert.throws(() => splitEpisodeSeconds(30), /1, 1.5, 2, 3, 4 veya 5/);
});

test("season is capped at 50 episodes", () => {
  assert.equal(MAX_SERIES_EPISODES, 50);
  assert.equal(assertSeriesEpisodeSlot(50), 50);
  assert.throws(() => assertSeriesEpisodeSlot(51), /50 bölümle kilitlendi/);
});

test("bible merge keeps characters and events across episodes", () => {
  const first = parseBible({
    logline: "İki kardeş İstanbul’da kayıp bir defteri arar",
    style: "yağmurlu neon, anamorphic",
    characters: [{ name: "Deniz", look: "kısa siyah saç, keskin bakış", clothing: "siyah trençkot", voice: "alçak" }],
    locations: [{ name: "Galata", look: "ıslak taş, sarı lamba" }],
    events: ["Defter çalınır"],
  });
  const next = mergeBible(first, {
    characters: [{ name: "Deniz", look: "aynı yüz", clothing: "aynı trençkot", voice: "alçak" }, { name: "Ece", look: "kızıl saç", clothing: "yeşil kaban", voice: "net" }],
    events: ["Galata’da iz bulunur"],
  });
  assert.equal(next.characters.length, 2);
  assert.match(next.characters[0]!.clothing, /trençkot/);
  assert.equal(next.events.length, 2);
  assert.match(bibleLockLine(next), /Deniz/);
  assert.match(bibleLockLine(next), /no morphing/i);
  assert.match(bibleLockLine(next), /ZORUNLU SÜREKLİLİK/);
});

test("locked identity never replaces face, voice, or origin memory", () => {
  const first = parseBible({
    logline: "Deniz kayıp defteri arar",
    characters: [{ name: "Deniz", look: "kısa siyah saç", clothing: "siyah trençkot", voice: "alçak" }],
    events: ["Bölüm 1 başladı"],
    referenceImages: ["https://example.com/deniz.jpg"],
    voiceLock: "alçak erkek",
    identityLocked: true,
  });
  const next = mergeBible(first, {
    logline: "Yeni dizi sıfırdan",
    characters: [{ name: "Deniz", look: "sarı saçlı başka biri", clothing: "kırmızı palto", voice: "ince" }],
    events: ["Bölüm 2 devam"],
    referenceImages: ["https://example.com/imposter.jpg"],
    voiceLock: "başka ses",
  });
  assert.equal(next.logline, "Deniz kayıp defteri arar");
  assert.equal(next.characters[0]!.look, "kısa siyah saç");
  assert.equal(next.characters[0]!.clothing, "siyah trençkot");
  assert.equal(next.characters[0]!.voice, "alçak");
  assert.equal(next.voiceLock, "alçak erkek");
  assert.equal(next.referenceImages[0], "https://example.com/deniz.jpg");
  assert.equal(next.referenceImages.includes("https://example.com/imposter.jpg"), true);
  assert.equal(next.events[0], "Bölüm 1 başladı");
  assert.equal(next.events.at(-1), "Bölüm 2 devam");
  assert.equal(next.identityLocked, true);
});

test("fallback scenes stay on product durations and lock identity", () => {
  const shots = splitEpisodeSeconds(60);
  const scenes = fallbackScenes({
    prompt: "Yağmurlu İstanbul’da kayıp defter",
    shots,
    bible: parseBible({
      characters: [{ name: "Deniz", look: "siyah trençkot", clothing: "siyah trençkot", voice: "alçak" }],
      locations: [{ name: "Galata", look: "ıslak sokak" }],
      lastSceneBeat: "Deniz köprüde durur",
    }),
    episodeTitle: "Bölüm 2",
    episodeNumber: 2,
    language: "tr",
    quality: "hd",
    aspect: "16:9",
    previous
... 