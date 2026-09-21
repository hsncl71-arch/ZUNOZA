import assert from "node:assert/strict";
import test from "node:test";
import { filenameFromDisposition } from "./save-media.ts";

test("download filename prefers RFC 5987 and strips path junk", () => {
  assert.equal(filenameFromDisposition('attachment; filename="zunoza.mp4"', "x.bin"), "zunoza.mp4");
  assert.equal(
    filenameFromDisposition("attachment; filename*=UTF-8''zunoza-gorsel.png", "x.bin"),
    "zunoza-gorsel.png",
  );
  assert.equal(filenameFromDisposition('inline; filename="../../hack.mp4"', "x.bin"), "hack.mp4");
});
