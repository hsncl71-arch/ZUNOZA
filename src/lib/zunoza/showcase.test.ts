import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import {
  DEFAULT_DISCOVER,
  DEFAULT_SHOWCASE,
  composeShowcasePrompt,
  moveClipOrder,
  publicShowcaseCard,
  showcasePlaybackUrl,
  showcasePosterAllowed,
  showcasePreviewAllowed,
  showcaseToRetry,
  sniffVideoContainer,
  titleFromVideoFilename,
  SHOWCASE_BADGE_LABEL,
} from "./showcase.ts";

test("default reel has ten distinct premium recipes with local previews", () => {
  assert.equal(DEFAULT_SHOWCASE.length, 10);
  const ids = new Set(DEFAULT_SHOWCASE.map((c) => c.id));
  assert.equal(ids.size, 10);
  for (const clip of DEFAULT_SHOWCASE) {
    assert.equal(clip.lane, "ilham");
    assert.equal(showcasePreviewAllowed(clip.previewUrl), true, clip.id);
    assert.equal(showcasePosterAllowed(clip.posterUrl), true, clip.id);
    assert.match(clip.scene, /\{subject\}/);
    assert.ok(clip.subject.length >= 3);
  }
});

test("discover seed has ten cards with posters and studio targets", () => {
  assert.equal(DEFAULT_DISCOVER.length, 10);
  const ids = new Set(DEFAULT_DISCOVER.map((c) => c.id));
  assert.equal(ids.size, 10);
  for (const clip of DEFAULT_DISCOVER) {
    assert.equal(clip.lane, "kesfet");
    assert.equal(showcasePreviewAllowed(clip.previewUrl), true, clip.id);
    assert.equal(showcasePosterAllowed(clip.posterUrl), true, clip.id);
    assert.ok(clip.studioPath.startsWith("/"));
    assert.ok(clip.prompt.length > 8);
  }
});

test("subject swap keeps cinematography and does not copy the sample file", () => {
  const honey = DEFAULT_SHOWCASE.find((c) => c.id === "wildlife")!;
  const original = composeShowcasePrompt(honey);
  const swapped = composeShowcasePrompt(honey, "ayı");
  assert.match(original, /bal porsuğu/);
  assert.doesNotMatch(swapped, /bal porsuğu/);
  assert.match(swapped, /ayı/);
  assert.match(swapped, /yavaş yaklaşan kamera/);
  assert.match(swapped, /gün batımı/);
  const retry = showcaseToRetry(honey, "ayı");
  assert.equal(retry.durationSeconds, 10);
  assert.equal(retry.aspect, "16:9");
  assert.equal(retry.quality, "hd");
  assert.equal(retry.sourceKind, "metin");
  assert.match(retry.prompt, /ayı/);
  const card = publicShowcaseCard(honey);
  assert.equal(card.previewUrl, "/showcase/wildlife.mp4");
  assert.equal(card.lane, "ilham");
});

test("preview urls reject traversal and random schemes", () => {
  assert.equal(showcasePreviewAllowed("/showcase/../secret.mp4"), false);
  assert.equal(showcasePreviewAllowed("javascript:alert(1)"), false);
  assert.equal(showcasePreviewAllowed("/showcase/wildlife.mp4"), true);
  assert.equal(showcasePreviewAllowed("https://cdn.example/a.mp4"), true);
  assert.equal(showcasePreviewAllowed("r2:showcase/ilham/wildlife/a.mp4"), true);
  assert.equal(showcasePreviewAllowed("/api/vitrin/wildlife"), true);
});

test("r2 stored clips play through the public catalog route and never leak the object key", () => {
  const honey = DEFAULT_SHOWCASE.find((c) => c.id === "wildlife")!;
  const stored = { ...honey, previewUrl: "r2:showcase/ilham/wildlife/abc.mp4", updatedAt: 1700000000000 };
  const url = showcasePlaybackUrl(stored);
  assert.equal(url, "/api/vitrin/wildlife?v=1700000000000");
  const card = publicShowcaseCard(stored);
  assert.equal(card.previewUrl.startsWith("/api/vitrin/wildlife"), true);
  assert.equal(card.previewUrl.includes("r2:"), false);
});

test("admin reorder swaps neighbors and stays in range", () => {
  assert.deepEqual(moveClipOrder(["a", "b", "c"], "b", -1), ["b", "a", "c"]);
  assert.deepEqual(moveClipOrder(["a", "b", "c"], "a", -1), ["a", "b", "c"]);
  assert.deepEqual(moveClipOrder(["a", "b", "c"], "c", 1), ["a", "b", "c"]);
  assert.deepEqual(moveClipOrder(["a", "b", "c"], "a", 1), ["b", "a", "c"]);
});

test("mp4 and mov containers are sniffed from ftyp without re-encoding", () => {
  const mp4 = new Uint8Array(12);
  mp4.set([0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d]);
  const mov = new Uint8Array(12);
  mov.set([0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70, 0x71, 0x74, 0x20, 0x20]);
  assert.equal(sniffVideoCont
... 