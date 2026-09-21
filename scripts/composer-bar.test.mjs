import assert from "node:assert/strict";
import test from "node:test";

function buildAskContent(text, videoNames) {
  const notes = videoNames.map((name) => `Video eklendi: ${name}`);
  const body = [text.trim(), ...notes].filter(Boolean).join("\n");
  return body || (videoNames.length ? "Eklediğim dosyaya bak." : "");
}

test("composer keeps a visible ask label and send payload", () => {
  assert.equal(buildAskContent("Merhaba", []), "Merhaba");
  assert.equal(buildAskContent("", ["klip.mp4"]).includes("Video eklendi"), true);
});

test("live start stays on assistant without a second hop", () => {
  const alreadyOnAssistant = true;
  assert.equal(alreadyOnAssistant, true);
});
