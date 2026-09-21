import assert from "node:assert/strict";
import test from "node:test";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { concatFileList, concatMp4Buffers, ffmpegAvailable, ffmpegBinary } from "./concat-video.server.ts";

const execFileAsync = promisify(execFile);

test("concatFileList quotes paths for ffmpeg concat demuxer", () => {
  assert.equal(concatFileList(["/tmp/a.mp4"]), "file '/tmp/a.mp4'");
  assert.equal(concatFileList(["/tmp/o'reilly.mp4"]), "file '/tmp/o'\\''reilly.mp4'");
});

async function writeLavfiClip(path: string, color: string) {
  await execFileAsync(
    ffmpegBinary(),
    [
      "-y",
      "-f",
      "lavfi",
      "-i",
      `color=c=${color}:s=320x240:d=0.4:r=24`,
      "-f",
      "lavfi",
      "-i",
      "anullsrc=r=48000:cl=stereo",
      "-shortest",
      "-c:v",
      "libx264",
      "-preset",
      "ultrafast",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      "-movflags",
      "+faststart",
      path,
    ],
    { timeout: 20_000 },
  );
}

test("concatMp4Buffers joins two real MP4s into one file", { timeout: 60_000 }, async () => {
  if (!(await ffmpegAvailable())) return;
  const dir = await mkdtemp(join(tmpdir(), "zunoza-concat-test-"));
  try {
    const a = join(dir, "a.mp4");
    const b = join(dir, "b.mp4");
    await writeLavfiClip(a, "red");
    await writeLavfiClip(b, "blue");
    const left = new Uint8Array(await readFile(a));
    const right = new Uint8Array(await readFile(b));
    assert.ok(left.byteLength > 32);
    assert.ok(right.byteLength > 32);
    const merged = await concatMp4Buffers([left, right]);
    assert.ok(merged.byteLength > 32);
    const out = join(dir, "out.mp4");
    await writeFile(out, merged);
    const probe = await execFileAsync(
      ffmpegBinary(),
      ["-i", out, "-hide_banner"],
      { timeout: 10_000 },
    ).catch((err: { stderr?: string }) => err);
    const info = `${(probe as { stderr?: string }).stderr || ""}`;
    assert.match(info, /Video:/);
    const duration = Number((info.match(/Duration: 00:00:0(\d\.\d+)/) || [])[1] || 0);
    if (Number.isFinite(duration) && duration > 0) {
      assert.ok(duration >= 0.6 && duration <= 1.4, `duration ${duration}`);
    }
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => undefined);
  }
});
