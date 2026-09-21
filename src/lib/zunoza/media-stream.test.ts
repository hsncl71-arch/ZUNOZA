import assert from "node:assert/strict";
import test from "node:test";
import { parseByteRange, pipeVideoResponse, rangedVideoResponse, videoFileResponse, videoHeadResponse } from "./media-stream.ts";
import { r2ClientMontageUrl, r2ClientVideoUrl, storedObjectKey } from "./r2.ts";

test("safari range probe gets 206 partial mp4", () => {
  const bytes = new Uint8Array(2048);
  bytes.set([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70], 0);
  const req = new Request("https://zunoza.test/api/videolar/x/indir", {
    headers: { range: "bytes=0-1" },
  });
  const res = videoFileResponse(bytes, req, "zunoza-x.mp4");
  assert.equal(res.status, 206);
  assert.equal(res.headers.get("content-type"), "video/mp4");
  assert.equal(res.headers.get("accept-ranges"), "bytes");
  assert.equal(res.headers.get("content-range"), "bytes 0-1/2048");
  assert.equal(res.headers.get("content-disposition")?.includes("inline"), true);
  assert.equal(parseByteRange("bytes=0-1", 2048)?.end, 1);
});

test("playback urls stay same-origin instead of private r2 or xai", () => {
  assert.equal(r2ClientVideoUrl("job-1", "r2:videos/u/job-1.mp4"), "/api/videolar/job-1/indir");
  assert.equal(r2ClientVideoUrl("job-1", "https://vidgen.x.ai/foo.mp4"), "/api/videolar/job-1/indir");
  assert.match(
    r2ClientVideoUrl("job-1", "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4") || "",
    /gtv-videos-bucket/,
  );
  assert.equal(r2ClientMontageUrl("p1", "r2:montages/u/p1.mp4"), "/api/montajlar/p1/indir");
});

test("upstream r2 206 is passed through as mp4", () => {
  const bytes = new Uint8Array([0, 1, 2, 3]);
  const req = new Request("https://zunoza.test/v", { headers: { range: "bytes=0-1" } });
  const res = rangedVideoResponse(bytes, req, "a.mp4", { status: 206, contentRange: "bytes 0-1/99" });
  assert.equal(res.status, 206);
  assert.equal(res.headers.get("content-type"), "video/mp4");
  assert.equal(res.headers.get("content-range"), "bytes 0-1/99");
});

test("r2 delete target is only object refs, not provider urls", () => {
  assert.equal(storedObjectKey("r2:videos/u/job-1.mp4"), "videos/u/job-1.mp4");
  assert.equal(storedObjectKey("https://vidgen.x.ai/foo.mp4"), null);
  assert.equal(storedObjectKey(null), null);
});

test("head probe does not require a body", () => {
  const res = videoHeadResponse(4096, "zunoza-x.mp4");
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("accept-ranges"), "bytes");
  assert.equal(res.headers.get("content-length"), "4096");
  assert.equal(res.headers.get("content-type"), "video/mp4");
});
