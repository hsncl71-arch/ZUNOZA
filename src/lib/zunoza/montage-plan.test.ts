import assert from "node:assert/strict";
import test from "node:test";
import { montageCredits } from "./credit-economy.ts";
import {
  clampMontageDuration,
  clampTrimStart,
  clipPlayLength,
  montageProgressCopy,
  montageQuoteLabel,
  normalizeMontageClip,
  quoteMontageCredits,
  reorderClips,
  splitMontageClip,
  timelineSeconds,
} from "./montage-plan.ts";
import { sniffAudioMime } from "./montage-upload.ts";

test("clip duration clamps to 1–180 and timeline sums mixed lengths", () => {
  assert.equal(clampMontageDuration(10), 10);
  assert.equal(clampMontageDuration(30), 30);
  assert.equal(clampMontageDuration(99), 99);
  assert.equal(clampMontageDuration(400), 180);
  assert.equal(clampMontageDuration(0), 1);
  assert.equal(
    timelineSeconds([{ duration: 10 }, { duration: 10 }, { duration: 15 }, { duration: 5 }]),
    40,
  );
});

test("trim + length never exceeds the source clip", () => {
  assert.equal(clampTrimStart(-4, 10), 0);
  assert.equal(clampTrimStart(9, 10), 9);
  assert.equal(clampTrimStart(40, 10), 9);
  assert.equal(clipPlayLength({ duration: 10, trimStart: 0 }, 10), 10);
  assert.equal(clipPlayLength({ duration: 8, trimStart: 4 }, 10), 6);
  assert.equal(clipPlayLength({ duration: 30, trimStart: 0 }, 10), 10);
});

test("reorder and split keep every clip", () => {
  const clips = [{ id: "a" }, { id: "b" }, { id: "c" }];
  assert.deepEqual(
    reorderClips(clips, 2, 0).map((c) => c.id),
    ["c", "a", "b"],
  );
  const split = splitMontageClip({
    id: "x",
    kind: "video",
    assetId: "a1",
    label: "Klip",
    duration: 10,
    trimStart: 0,
  });
  assert.ok(split);
  const [left, right] = split;
  assert.equal(left.duration + right.duration, 10);
  assert.equal(right.trimStart, 5);
});

test("quote and progress copy stay user-facing", () => {
  assert.equal(quoteMontageCredits(15, 1), 1);
  assert.equal(quoteMontageCredits(16, 1), 2);
  assert.ok(montageCredits(15) >= 1);
  assert.match(montageQuoteLabel({ quoteReady: false, quoteError: false, unlimited: false, credits: 2, duration: 15 }), /hesaplanıyor/);
  assert.match(montageQuoteLabel({ quoteReady: true, quoteError: true, unlimited: false, credits: 2, duration: 15 }), /hesaplanamadı/);
  const done = montageProgressCopy("tamamlandi", new Date().toISOString());
  assert.equal(done.running, false);
  assert.match(done.hint, /hazır/);
  assert.ok(
    normalizeMontageClip({ id: "1", kind: "video", assetId: "a", duration: 12, label: "Sahne" }),
  );
});

test("audio magic-byte sniff rejects non-audio and html disguised as mp3", () => {
  const id3 = new Uint8Array([0x49, 0x44, 0x33, 0x03, 0, 0, 0, 0, 0, 0, 0, 0]);
  assert.equal(sniffAudioMime(id3), "audio/mpeg");
  const wav = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x41, 0x56, 0x45]);
  assert.equal(sniffAudioMime(wav), "audio/wav");
  const html = new TextEncoder().encode("<!doctype html><html></html>");
  assert.equal(sniffAudioMime(html, "audio/mpeg"), null);
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
  assert.equal(sniffAudioMime(png, "audio/wav"), null);
});
