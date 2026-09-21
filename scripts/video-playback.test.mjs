import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const r2 = readFileSync(new URL("../src/lib/zunoza/r2.ts", import.meta.url), "utf8");
const indir = readFileSync(new URL("../src/routes/api/videolar.$jobId.indir.ts", import.meta.url), "utf8");
const player = readFileSync(new URL("../src/components/studio-video.tsx", import.meta.url), "utf8");
const detail = readFileSync(new URL("../src/routes/videolarim_.$jobId.tsx", import.meta.url), "utf8");

test("completed videos play through range-capable same-origin proxy", () => {
  assert.match(r2, /\/api\/videolar\/\$\{encodeURIComponent\(jobId\)\}\/indir/);
  assert.doesNotMatch(r2, /r2PlaybackUrl\(r2ObjectKey\(stored\)\) \?\? `\/api\/videolar/);
  assert.match(indir, /rangedVideoResponse/);
  assert.match(indir, /getR2ObjectRange/);
  assert.match(indir, /HEAD:/);
  assert.match(player, /webkit-playsinline/);
  assert.match(player, /Video yüklenemedi/);
  assert.match(player, /IntersectionObserver/);
  assert.match(detail, /StudioVideo/);
  assert.match(detail, /VIDEO_RETRY_KEY/);
});
