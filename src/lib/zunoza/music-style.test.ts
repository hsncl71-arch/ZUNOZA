import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import {
  assertMusicStyleInput,
  composeMusicStyleBlock,
  CUSTOM_STYLE_ID,
  MUSIC_STYLES,
  musicStyleById,
  normalizeMusicStyleId,
  storedMusicGenre,
} from "./music-style.ts";

const music = readFileSync(new URL("./music.ts", import.meta.url), "utf8");
const muzik = readFileSync(new URL("../../routes/muzik.tsx", import.meta.url), "utf8");

test("catalog keeps world styles and adds Turkish regional ones", () => {
  const labels = MUSIC_STYLES.map((s) => s.label);
  for (const need of [
    "Türk Halk Müziği",
    "Bozlak",
    "Kırşehir Bozlağı",
    "Uzun Hava",
    "Bağlama / Saz ağırlıklı",
    "Türk Sanat Müziği",
    "Arabesk",
    "İlahi",
    "Tasavvuf Müziği",
    "Ney ağırlıklı",
    "Kaval ağırlıklı",
    "Davul-Zurna",
    "Oyun Havası",
    "Anadolu Rock",
    "Özgün Müzik",
    "Pop",
    "Rock",
    "Rap",
    "Hip-Hop",
    "Elektronik",
    "Sinematik",
    "Özel Tarz",
  ]) {
    assert.ok(labels.includes(need), `missing ${need}`);
  }
});

test("custom style is required and lands in the production prompt", () => {
  assert.throws(() => assertMusicStyleInput(CUSTOM_STYLE_ID, "kısa"), /Özel tarz/);
  const ok = assertMusicStyleInput(CUSTOM_STYLE_ID, "Ney ve bendir ağırlıklı sakin tasavvuf atmosferi");
  const block = composeMusicStyleBlock({
    styleId: ok.styleId,
    styleNote: ok.styleNote,
    mood: "Sakin",
  });
  assert.match(block, /Custom style instruction/);
  assert.match(block, /Ney ve bendir/);
  assert.match(block, /Mood: Sakin/);
  assert.equal(storedMusicGenre(CUSTOM_STYLE_ID, ok.styleNote).startsWith("Ney"), true);
});

test("preset style adds instrument hints, unknown ids fall back", () => {
  assert.equal(normalizeMusicStyleId("Kırşehir Bozlağı"), "kirsehir-bozlagi");
  const kirsehir = composeMusicStyleBlock({ styleId: "kirsehir-bozlagi", mood: "Yanık" });
  assert.match(kirsehir, /bağlama|saz/i);
  assert.match(kirsehir, /Kırşehir/);
  assert.equal(musicStyleById("nope").id, "sinematik");
  const mixed = composeMusicStyleBlock({
    styleId: "bozlak",
    styleNote: "güçlü bağlama, ağır tempo, yanık erkek vokal",
  });
  assert.match(mixed, /Bozlak/);
  assert.match(mixed, /yanık erkek vokal/);
});

test("studio music and lyrics send styleId/styleNote into the provider prompt", () => {
  const gen = music.slice(music.indexOf("export const generateStudioMusic"), music.indexOf("export const uploadStudioMusic"));
  assert.match(gen, /composeMusicStyleBlock/);
  assert.match(gen, /styleNote/);
  assert.match(gen, /styleBlock/);
  const lyrics = music.slice(music.indexOf("export const writeSongLyrics"), music.indexOf("export const generateVoiceSong"));
  assert.match(lyrics, /composeMusicStyleBlock/);
  assert.match(lyrics, /styleBlock/);
  assert.match(muzik, /Özel tarz tarifi/);
  assert.match(muzik, /CUSTOM_STYLE_ID/);
  assert.match(muzik, /styleNote/);
  assert.match(muzik, /Kırşehir bozlağı tarzında/);
  assert.doesNotMatch(muzik, /const GENRES = \["Sinematik"/);
});
