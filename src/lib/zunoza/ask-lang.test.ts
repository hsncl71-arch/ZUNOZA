import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import {
  askLanguageInstruction,
  askReplyLanguageFromHistory,
  askStatusLine,
  detectMessageLanguage,
  resolveAskReplyLanguage,
  ttsLanguageCode,
} from "./ask-lang.ts";

const TZ = "Europe/Istanbul";

test("first written message sets reply language even with TR locale", () => {
  assert.equal(askReplyLanguageFromHistory([{ role: "user", content: "Hello, how are you?" }], TZ), "en");
  assert.equal(askReplyLanguageFromHistory([{ role: "user", content: "Merhaba, nasılsın?" }], TZ), "tr");
  assert.equal(askReplyLanguageFromHistory([{ role: "user", content: "مرحبا كيف حالك؟" }], TZ), "ar");
});

test("short tokens keep conversation language", () => {
  const prev = [
    { role: "user", content: "Hello, how are you?" },
    { role: "assistant", content: "I'm good, thanks!" },
  ];
  assert.equal(resolveAskReplyLanguage({ current: "OK", previous: prev, timeZone: TZ }), "en");
  assert.equal(resolveAskReplyLanguage({ current: "API", previous: prev, timeZone: TZ }), "en");
  assert.equal(resolveAskReplyLanguage({ current: "hmm", previous: prev, timeZone: TZ }), "en");
});

test("explicit request and code-switch beat locale", () => {
  assert.equal(detectMessageLanguage("API key nerede?"), "tr");
  assert.equal(resolveAskReplyLanguage({ current: "Please speak English", timeZone: TZ }), "en");
  assert.equal(resolveAskReplyLanguage({ current: "Türkçe konuş", timeZone: TZ }), "tr");
  assert.match(askLanguageInstruction("en"), /English/);
});

test("written chat wiring no longer hard-locks Turkish", () => {
  const assistant = readFileSync(new URL("./assistant.ts", import.meta.url), "utf8");
  const stream = readFileSync(new URL("./assistant-stream.server.ts", import.meta.url), "utf8");
  const persona = readFileSync(new URL("./ask-persona.ts", import.meta.url), "utf8");
  const voices = readFileSync(new URL("./voices.ts", import.meta.url), "utf8");
  const stt = readFileSync(new URL("./media-stt.ts", import.meta.url), "utf8");
  assert.doesNotMatch(assistant, /Türkçe, açık ve yardımcı ol/);
  assert.doesNotMatch(assistant, /Türkçe, kısa ve kaynaklı özet yaz/);
  assert.match(assistant, /askLanguageInstruction\(lang\)/);
  assert.match(assistant, /ttsLanguageCode\(text\)/);
  assert.match(assistant, /askReplyLanguageFromHistory/);
  assert.match(stream, /askReplyLanguageFromHistory/);
  assert.match(stream, /askStatusLine\(replyLanguage/);
  assert.match(persona, /doğal konuşan bir sohbet arkadaşı/);
  assert.doesNotMatch(persona.split("ASK_PERSONA_LIVE")[0], /doğal Türkçe konuşan/);
  assert.doesNotMatch(persona, /doğal Türkçe konuş/);
  assert.doesNotMatch(voices, /language_hint:\s*"tr"/);
  assert.match(voices, /Kullanıcının konuştuğu dilde/);
  assert.doesNotMatch(stt, /form\.set\("language", "tr"\)/);
  assert.match(stt, /assertAiRateLimit\(context\.userId, "stt"/);
});

test("status and TTS codes follow the resolved language", () => {
  assert.equal(ttsLanguageCode("Hello, how are you?"), "en");
  assert.equal(ttsLanguageCode("Merhaba, nasılsın?"), "tr");
  assert.equal(ttsLanguageCode("مرحبا كيف حالك؟"), "ar");
  assert.equal(askStatusLine("en", "searching"), "Checking sources…");
  assert.equal(askStatusLine("tr", "thinking"), "Bir saniye…");
  assert.match(askStatusLine("tr", "searchFail"), /güncel veriye/);
});

