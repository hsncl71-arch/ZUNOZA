import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { musicCredits, voiceSongCredits, ttsCredits, DEFAULT_VIDEO_CREDIT_TABLE } from "./credit-economy.ts";

const music = readFileSync(new URL("./music.ts", import.meta.url), "utf8");
const tts = readFileSync(new URL("./tts.ts", import.meta.url), "utf8");
const muzik = readFileSync(new URL("../../routes/muzik.tsx", import.meta.url), "utf8");
const ses = readFileSync(new URL("../../routes/seslendirme.tsx", import.meta.url), "utf8");
const privacy = readFileSync(new URL("./privacy.ts", import.meta.url), "utf8");

test("music and voice-song charge before the provider and refund on failure", () => {
  assert.match(music, /chargeCredits/);
  assert.match(music, /refundCredits/);
  assert.match(music, /musicCredits\(/);
  assert.match(music, /voiceSongCredits\(/);
  assert.match(music, /assertSpendCap/);
  assert.match(music, /assertNotDuplicate/);
  assert.match(music, /assertFreeTierAllows/);
  assert.match(music, /logAiUsage/);
  const gen = music.slice(music.indexOf("export const generateStudioMusic"), music.indexOf("export const uploadStudioMusic"));
  assert.ok(gen.indexOf("chargeCredits") < gen.indexOf("composeMusic("));
  assert.match(gen, /note: "Müzik üretimi iadesi"/);
  const voice = music.slice(music.indexOf("export const generateVoiceSong"), music.length);
  assert.ok(voice.indexOf("chargeCredits") < voice.indexOf("voices/add"));
  assert.match(voice, /sniffAudioMime/);
  assert.match(voice, /assertAiRateLimit\(context\.userId, "voice_song"/);
  assert.match(voice, /recordConsent/);
  assert.match(voice, /voice_deleted/);
  assert.match(voice, /publicAiError/);
});

test("TTS charges, rate-limits, and never tells the user credits were skipped", () => {
  assert.match(tts, /sniffAudioMime/);
  assert.match(tts, /chargeCredits/);
  assert.match(tts, /refundCredits/);
  assert.match(tts, /assertAiRateLimit\(context\.userId, "voice_tts"/);
  assert.match(ses, /sendingRef/);
  assert.match(ses, /ttsCredits/);
  assert.doesNotMatch(ses, /Kredi düşülmedi/);
  assert.match(ses, /Montaja ekle/);
  assert.match(ses, /Klibe ekle/);
});

test("music studio uses catalog credits, double-submit lock, and keeps voice consent", () => {
  assert.match(muzik, /sendingRef/);
  assert.match(muzik, /getCreditCatalog/);
  assert.match(muzik, /musicCredits\(/);
  assert.match(muzik, /voiceSongCredits\(/);
  assert.match(muzik, /quoteError/);
  assert.match(muzik, /quoteReady/);
  assert.match(muzik, /Başkasının sesini izinsiz/);
  assert.match(muzik, /consent/);
  assert.match(muzik, /Klibe ekle/);
  assert.match(muzik, /StudioAudio/);
  assert.match(muzik, /ScreenLoader/);
  assert.match(muzik, /MUSIC_STYLES/);
  assert.match(muzik, /styleNote/);
  assert.doesNotMatch(muzik, /Şarkı Oluştur — 2 kredi/);
  assert.match(privacy, /voice_clone: "voice_clone.v1"/);
});

test("economy music credits stay conservative and duration-scaled", () => {
  assert.equal(musicCredits(15), 1);
  assert.equal(musicCredits(30), 1);
  assert.equal(musicCredits(45), 1);
  assert.ok(voiceSongCredits(15) >= 3);
  assert.ok(voiceSongCredits(45) >= voiceSongCredits(30));
  assert.ok(ttsCredits(400) >= 1);
  assert.ok(musicCredits(15) < DEFAULT_VIDEO_CREDIT_TABLE["5"].ekonomik);
});

test("vocal lyrics use composition_plan and never silently fall back to instrumental", () => {
  const gen = music.slice(music.indexOf("export const generateStudioMusic"), music.indexOf("export const uploadStudioMusic"));
  assert.match(music, /composition_plan/);
  assert.match(music, /force_instrumental: instrumental/);
  assert.match(gen, /Türkçe sözlü vokal için şarkı sözü yazın/);
  assert.match(music, /Sahte sözlü şarkı üretilmez/);
  assert.match(muzik, /instrumental \|\| lyrics\.trim\(\)\.length >= 12/);
  assert.match(ses, /Video üretmez/);
  assert.match(ses, /saveMediaFromUrl/);
});
