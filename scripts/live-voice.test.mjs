import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const voices = readFileSync(new URL("../src/lib/zunoza/voices.ts", import.meta.url), "utf8");
const client = readFileSync(new URL("../src/lib/zunoza/realtime-client.ts", import.meta.url), "utf8");
const worklet = readFileSync(new URL("../public/zunoza-mic-worklet.js", import.meta.url), "utf8");
const asistan = readFileSync(new URL("../src/routes/asistan.tsx", import.meta.url), "utf8");

test("default live voice is mid-tone Sal, not thick Rex", () => {
  assert.match(voices, /DEFAULT_LIVE_VOICE: LiveVoiceId = "Sal"/);
  assert.match(voices, /orta tonda genç-doğal/);
  assert.doesNotMatch(voices, /DEFAULT_LIVE_VOICE: LiveVoiceId = "Rex"/);
});

test("live turn-taking is snappy and auto-responds", () => {
  assert.match(voices, /silence_duration_ms: 280/);
  assert.match(voices, /create_response: true/);
  assert.match(voices, /interrupt_response: true/);
  assert.match(voices, /turn_detection: \{ \.\.\.LIVE_TURN \}/);
});

test("live chat keeps web search available without requiring a search phrase", () => {
  assert.match(voices, /tools: searchOn \? \[\{ type: "web_search" \}\] : \[\]/);
  assert.match(client, /sessionPatch/);
  assert.match(client, /requestLiveSearch/);
  assert.match(client, /wantsWebSearch/);
  assert.match(client, /searchOn: true/);
  assert.match(voices, /web_search kullanılabilir/);
  assert.match(voices, /Kullanıcı araştır demesini bekleme/);
  assert.match(voices, /Sıradan sohbet, şiir, matematik/);
});

test("current-info live turns enable search without dropping the socket", () => {
  const fn = client.slice(client.indexOf("requestLiveSearch(text: string)"), client.indexOf("setMuted("));
  assert.match(fn, /sessionPatch\(true\)/);
  assert.match(fn, /if \(!this\.speaking\) return;/);
  assert.doesNotMatch(fn, /this\.stop\(\)/);
});

test("playback stays primed instead of chopping on short gaps", () => {
  assert.match(worklet, /primeNeed/);
  assert.doesNotMatch(worklet, /starveLimit/);
  assert.match(client, /rate \* 0\.04/);
  const flush = worklet.slice(worklet.indexOf("d.flush"), worklet.indexOf("return;", worklet.indexOf("d.flush")) + 8);
  assert.doesNotMatch(flush, /primed = false/);
  const stop = client.slice(client.indexOf("private stopPlayback()"), client.indexOf("private stopPlayback()") + 280);
  assert.doesNotMatch(stop, /playPrimed = false/);
});

test("barge-in cuts assistant audio immediately on user speech", () => {
  assert.match(client, /if \(!this\.speaking\) return;/);
  assert.match(client, /cutAssistantForUser/);
  assert.match(client, /detectLocalBargeIn/);
  assert.match(client, /armIgnore\(140\)/);
  assert.doesNotMatch(client, /lastPlayAt < 2000/);
  assert.doesNotMatch(client, /setTimeout\(\(\) => \{\s*this\.bargeTimer = null;\s*this\.armIgnore\(90\)/);
});

test("response audio done does not cut the turn", () => {
  assert.match(client, /if \(type === "response\.output_audio\.done"\) \{\s*return;/s);
  assert.match(client, /if \(type === "response\.done"\) \{/);
});

test("live reconnect keeps trying instead of dropping after 3", () => {
  assert.doesNotMatch(client, /reconnects >= 3/);
  assert.match(client, /Bağlantı yeniden kuruluyor/);
});

test("microphone is requested once with echo cancellation", () => {
  assert.match(client, /echoCancellation: true/);
  assert.equal((client.match(/getUserMedia\(/g) || []).length, 1);
});

test("session and mic start in parallel", () => {
  assert.match(asistan, /const streamP = getMicrophoneStream\(\)/);
  assert.match(asistan, /const sessionP = createVoiceLiveSession/);
  assert.match(asistan, /stream = await streamP/);
  assert.match(asistan, /memoryRows\.map/);
  assert.match(asistan, /updateMemories/);
  assert.match(asistan, /speakCue/);
});

test("written ask still streams and can edit photos", () => {
  assert.match(asistan, /streamZunozaAsk/);
  assert.match(asistan, /editStudioImage/);
  assert.match(asistan, /stashEditSource/);
  assert.match(asistan, /tryMemoryCommand/);
});
