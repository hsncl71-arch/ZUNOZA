import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("native WebView keeps cache and does not freeze job polling", () => {
  const java = readFileSync("android/app/src/main/java/app/zunoza/mobile/MainActivity.java", "utf8");
  const cap = readFileSync("capacitor.config.ts", "utf8");
  const ios = readFileSync("ios/App/App/MainViewController.swift", "utf8");
  assert.match(java, /LOAD_DEFAULT/);
  assert.match(java, /LAYER_TYPE_HARDWARE/);
  assert.match(java, /onTrimMemory/);
  assert.doesNotMatch(java, /pauseTimers/);
  assert.match(cap, /launchShowDuration:\s*500/);
  assert.match(ios, /allowsLinkPreview = false/);
});

test("thumbs, range requests and poll backoff stay in place without quality cuts", () => {
  const thumb = readFileSync("src/components/studio-video.tsx", "utf8");
  const stream = readFileSync("src/lib/zunoza/media-stream.ts", "utf8");
  const perf = readFileSync("src/lib/zunoza/perf.ts", "utf8");
  const api = readFileSync("src/lib/zunoza/api.ts", "utf8");
  assert.match(thumb, /IntersectionObserver/);
  assert.match(thumb, /preload="metadata"/);
  assert.match(stream, /rangedVideoResponse/);
  assert.match(stream, /serveStoredVideo/);
  assert.match(stream, /pipeVideoResponse/);
  assert.match(perf, /nextPollDelay/);
  assert.match(api, /shouldPollProvider/);
  assert.doesNotMatch(thumb, /480p-only|forceLowQuality/);
});
