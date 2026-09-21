/** Server-only MP4 concat. Real ffmpeg — no fake merge. Cut edits only (no fade). */

import { execFile } from "node:child_process";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export function ffmpegBinary() {
  const explicit = process.env.FFMPEG_PATH?.trim();
  if (explicit) return explicit;
  return "ffmpeg";
}

export async function ffmpegAvailable() {
  try {
    await execFileAsync(ffmpegBinary(), ["-version"], { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

export function concatFileList(paths: string[]) {
  return paths.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join("\n");
}

async function runFfmpeg(args: string[], timeout = 180_000) {
  await execFileAsync(ffmpegBinary(), args, { timeout, maxBuffer: 8 * 1024 * 1024 });
}

/** Concat MP4s into one file. Tries stream copy first, then a real re-encode. */
export async function concatMp4Buffers(clips: Uint8Array[]): Promise<Uint8Array> {
  if (clips.length < 1) throw new Error("Birleştirilecek klip yok.");
  if (clips.length === 1) return clips[0]!;
  const dir = await mkdtemp(join(tmpdir(), "zunoza-concat-"));
  try {
    const paths: string[] = [];
    for (let i = 0; i < clips.length; i += 1) {
      const bytes = clips[i]!;
      if (bytes.byteLength < 32) throw new Error(`Klip ${i + 1} boş veya bozuk.`);
      const path = join(dir, `${String(i).padStart(3, "0")}.mp4`);
      await writeFile(path, bytes);
      paths.push(path);
    }
    const listPath = join(dir, "list.txt");
    await writeFile(listPath, concatFileList(paths), "utf8");
    const copied = join(dir, "copy.mp4");
    try {
      await runFfmpeg([
        "-y",
        "-f",
        "concat",
        "-safe",
        "0",
        "-i",
        listPath,
        "-c",
        "copy",
        "-fflags",
        "+genpts",
        "-avoid_negative_ts",
        "make_zero",
        "-movflags",
        "+faststart",
        copied,
      ]);
      const out = await readFile(copied);
      if (out.byteLength > 32) return new Uint8Array(out);
    } catch {
      /* fall through to encode */
    }
    const encoded = join(dir, "encoded.mp4");
    await runFfmpeg(
      [
        "-y",
        "-f",
        "concat",
        "-safe",
        "0",
        "-i",
        listPath,
        "-fflags",
        "+genpts",
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-crf",
        "20",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-ar",
        "48000",
        "-ac",
        "2",
        "-movflags",
        "+faststart",
        encoded,
      ],
      240_000,
    );
    const out = await readFile(encoded);
    if (out.byteLength < 32) throw new Error("Birleşik MP4 boş kaldı.");
    return new Uint8Array(out);
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => undefined);
  }
}
