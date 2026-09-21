import assert from "node:assert/strict";
import test from "node:test";
import { shareNativeFile } from "./native-media.ts";

test("native share is skipped outside Capacitor so web download stays intact", async () => {
  const file = new File([new Uint8Array([1, 2, 3])], "clip.mp4", { type: "video/mp4" });
  assert.equal(await shareNativeFile(file, "ZUNOZA"), "skip");
});
