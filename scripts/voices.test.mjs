import assert from "node:assert/strict";
import test from "node:test";

const LIVE_VOICES = [
  { id: "Rex" },
  { id: "Sal" },
  { id: "Leo" },
  { id: "Atlas" },
  { id: "Naksh" },
  { id: "Perseus" },
  { id: "Rigel" },
  { id: "Castor" },
  { id: "Ara" },
  { id: "Eve" },
];
const DEFAULT_LIVE_VOICE = "Sal";

function resolveLiveVoice(id) {
  const wanted = (id || "").trim().toLowerCase();
  const hit = LIVE_VOICES.find((v) => v.id.toLowerCase() === wanted);
  return hit?.id ?? DEFAULT_LIVE_VOICE;
}

test("default live voice is Sal", () => {
  assert.equal(DEFAULT_LIVE_VOICE, "Sal");
  assert.equal(resolveLiveVoice(null), "Sal");
  assert.equal(resolveLiveVoice(""), "Sal");
  assert.equal(resolveLiveVoice("Ara"), "Ara");
  assert.equal(resolveLiveVoice("rex"), "Rex");
  assert.equal(resolveLiveVoice("unknown"), "Sal");
});
