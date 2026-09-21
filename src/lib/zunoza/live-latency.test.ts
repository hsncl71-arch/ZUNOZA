import assert from "node:assert/strict";
import test from "node:test";
import { isInternalLiveError, summarizeLiveTurn } from "./live-errors.ts";
import { DEFAULT_LIVE_VOICE, LIVE_REASONING, liveSessionConfig } from "./voices.ts";

test("internal cancel errors are not user-facing", () => {
  assert.equal(isInternalLiveError("Cancellation failed: no active response found."), true);
  assert.equal(isInternalLiveError("cancellation failed"), true);
  assert.equal(isInternalLiveError("Canlı ses soketi açılamadı."), false);
  assert.equal(isInternalLiveError("Mikrofon izni verilmedi."), false);
});

test("live session is Sal + no high reasoning + web search stays on", () => {
  assert.equal(DEFAULT_LIVE_VOICE, "Sal");
  assert.equal(LIVE_REASONING.effort, "none");
  const session = liveSessionConfig({ clockLine: "test", searchOn: true, voice: "Sal" });
  assert.equal(session.voice, "Sal");
  assert.equal(session.reasoning.effort, "none");
  assert.deepEqual(session.tools, [{ type: "web_search" }]);
  assert.equal(session.turn_detection.create_response, true);
  assert.match(session.instructions, /web_search/);
});

test("turn summary reports first-audio-after-silence", () => {
  const summary = summarizeLiveTurn({
    speechStartedAt: 1000,
    speechStoppedAt: 1800,
    transcriptAt: 2100,
    responseCreatedAt: 2200,
    firstAudioAt: 2600,
  });
  assert.equal(summary.vadMs, 800);
  assert.equal(summary.sttAfterStopMs, 300);
  assert.equal(summary.modelToAudioMs, 400);
  assert.equal(summary.firstAudioAfterSilenceMs, 800);
});
