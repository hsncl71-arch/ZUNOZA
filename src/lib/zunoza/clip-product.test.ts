import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const board = readFileSync(new URL("../../routes/storyboard.tsx", import.meta.url), "utf8");
const home = readFileSync(new URL("../../routes/montaj.tsx", import.meta.url), "utf8");
const editor = readFileSync(new URL("../../routes/montaj_.$projectId.tsx", import.meta.url), "utf8");
const muzik = readFileSync(new URL("../../routes/muzik.tsx", import.meta.url), "utf8");
const ses = readFileSync(new URL("../../routes/seslendirme.tsx", import.meta.url), "utf8");
const detail = readFileSync(new URL("../../routes/videolarim_.$jobId.tsx", import.meta.url), "utf8");
const olustur = readFileSync(new URL("../../routes/olustur.tsx", import.meta.url), "utf8");

test("clip page keeps attached music/audio through montage and locks double produce", () => {
  assert.match(board, /sendingRef/);
  assert.match(board, /attachedMusic/);
  assert.match(board, /attachedAudio/);
  assert.match(board, /musicId: attachedMusic\?\.id/);
  assert.match(board, /audioId: attachedAudio\?\.id/);
  assert.match(board, /STORYBOARD_HANDOFF_KEY/);
  assert.match(board, /quoteError/);
  assert.match(board, /getCreditCatalog/);
  assert.match(board, /Montaja aktar/);
  assert.match(board, /ScreenLoader/);
  assert.match(board, /nextPollDelay/);
});

test("montage home applies music and TTS from clip handoff", () => {
  assert.match(home, /parseStoryboardHandoff/);
  assert.match(home, /parseMusicHandoff/);
  assert.match(home, /parseAudioHandoff/);
  assert.match(home, /voiceAssetId: voiceId/);
  assert.match(home, /musicAssetId: musicId/);
  assert.match(editor, /zunoza\.studioAudio/);
  assert.match(editor, /blobFallback\(musicUrl, "audio\/mpeg"\)/);
});

test("produce → clip → montage handoff exists from music, voice, video", () => {
  assert.match(muzik, /handoff\("storyboard"/);
  assert.match(muzik, /handoff\("montage"/);
  assert.match(ses, /handoff\("storyboard"/);
  assert.match(ses, /handoff\("montage"/);
  assert.match(detail, /Klibe ekle/);
  assert.match(detail, /Montaja aktar/);
  assert.match(olustur, /MUSIC_HANDOFF_KEY/);
  assert.match(olustur, /AUDIO_HANDOFF_KEY/);
  assert.match(olustur, /resolveStudioImage/);
  assert.match(board, /scenes\.some\(\(s\) => s\.prompt\.trim\(\)\.length < 8\)/);
});

test("clip and video studios never fill the prompt from leftover TTS text", () => {
  assert.match(board, /PROMPT_KEYS\.clip/);
  assert.doesNotMatch(board, /setPrompt\(.*attachedAudio/);
  assert.doesNotMatch(board, /newScene\(audio/);
  assert.doesNotMatch(board, /zunoza\.studioPrompt/);
  assert.doesNotMatch(olustur, /setPrompt\(parsed\.text/);
  assert.doesNotMatch(olustur, /zunoza\.studioPrompt/);
  assert.match(olustur, /jobMediaKey/);
  assert.match(detail, /PROMPT_KEYS\.clip/);
  assert.doesNotMatch(detail, /zunoza\.studioPrompt/);
  assert.match(detail, /saveMediaFromUrl/);
  assert.match(detail, /JobProgress/);
});
