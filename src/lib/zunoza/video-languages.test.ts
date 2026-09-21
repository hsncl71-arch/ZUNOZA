import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_VIDEO_LANGUAGE,
  VIDEO_SPEECH_LANGUAGES,
  normalizeVideoLanguage,
  speechLanguageHint,
  videoSpeechLanguage,
} from "./video-languages.ts";
import { voicePromptSuffix } from "./video-request.ts";

const REQUIRED = [
  "tr",
  "en",
  "az",
  "ar",
  "de",
  "fr",
  "es",
  "it",
  "pt",
  "ru",
  "fa",
  "zh",
  "ja",
  "ko",
  "hi",
] as const;

test("catalog is unique ISO codes and includes the international allowlist", () => {
  const ids = VIDEO_SPEECH_LANGUAGES.map((row) => row.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const id of REQUIRED) {
    assert.ok(ids.includes(id), `missing ${id}`);
  }
  for (const row of VIDEO_SPEECH_LANGUAGES) {
    assert.match(row.id, /^[a-z]{2}$/);
    assert.ok(row.label.length > 1);
    assert.ok(row.promptName.length > 1);
  }
});

test("unknown and regional tags normalize; only catalog ids are kept", () => {
  assert.equal(normalizeVideoLanguage(undefined), DEFAULT_VIDEO_LANGUAGE);
  assert.equal(normalizeVideoLanguage(""), "tr");
  assert.equal(normalizeVideoLanguage("FR"), "fr");
  assert.equal(normalizeVideoLanguage("zh-CN"), "zh");
  assert.equal(normalizeVideoLanguage("pt-BR"), "pt");
  assert.equal(normalizeVideoLanguage("en-US"), "en");
  assert.equal(normalizeVideoLanguage("zz"), "tr");
  assert.equal(normalizeVideoLanguage("kling"), "tr");
  assert.equal(videoSpeechLanguage("ja").promptName, "Japanese");
});

test("spoken mode steers catalog languages through the Imagine prompt, not a fake API field", () => {
  assert.match(speechLanguageHint("tr"), /Türkçe/);
  assert.match(speechLanguageHint("en"), /English/);
  assert.match(speechLanguageHint("az"), /Azerbaijani/);
  assert.match(speechLanguageHint("ja"), /Japanese/);
  assert.match(speechLanguageHint("fa"), /Persian/);
  assert.match(speechLanguageHint("xx"), /Türkçe/);
  assert.match(voicePromptSuffix({ voiceMode: "konusma", language: "de" }), /German/);
  assert.match(voicePromptSuffix({ voiceMode: "konusma", language: "ko" }), /Korean/);
  assert.doesNotMatch(voicePromptSuffix({ voiceMode: "ortam", language: "ja" }), /Japanese/);
  assert.doesNotMatch(voicePromptSuffix({ voiceMode: "sessiz", language: "en" }), /English/);
});
