import assert from "node:assert/strict";
import test from "node:test";
import { zipUtf8Files } from "./builder-zip.ts";

test("builder zip is a real PK archive of allowed files", () => {
  const bytes = zipUtf8Files({
    "index.html": "<html><body>ok</body></html>",
    "data.json": "{\"ok\":true}",
    "../x": "nope",
  });
  const text = Buffer.from(bytes).toString("latin1");
  assert.equal(bytes[0], 0x50);
  assert.equal(bytes[1], 0x4b);
  assert.match(text, /index\.html/);
  assert.match(text, /data\.json/);
  assert.doesNotMatch(text, /\.\.\/x/);
});
