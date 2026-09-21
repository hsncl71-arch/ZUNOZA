import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("mobile production modules keep double-submit locks and do not add 30s video", () => {
  const olustur = readFileSync("src/routes/olustur.tsx", "utf8");
  const gorsel = readFileSync("src/routes/gorsel.tsx", "utf8");
  const muzik = readFileSync("src/routes/muzik.tsx", "utf8");
  const ses = readFileSync("src/routes/seslendirme.tsx", "utf8");
  const board = readFileSync("src/routes/storyboard.tsx", "utf8");
  const montaj = readFileSync("src/routes/montaj.tsx", "utf8");
  const asistan = readFileSync("src/routes/asistan.tsx", "utf8");
  const insa = readFileSync("src/routes/insa-et.tsx", "utf8");
  const anilar = readFileSync("src/routes/anilar.tsx", "utf8");
  for (const [name, src] of [
    ["olustur", olustur],
    ["gorsel", gorsel],
    ["muzik", muzik],
    ["ses", ses],
    ["storyboard", board],
    ["montaj", montaj],
    ["asistan", asistan],
    ["insa-et", insa],
    ["anilar", anilar],
  ] as const) {
    assert.match(src, /sendingRef/, name);
  }
  assert.match(olustur, /const DURATIONS = \[5, 10, 15\]/);
  assert.doesNotMatch(olustur, /30 saniye/);
  assert.match(olustur, /source === "gorsel"/);
  assert.match(olustur, /source === "metin"/);
});

test("save/share on native is first and Android does not freeze job polling in background", () => {
  const save = readFileSync("src/lib/zunoza/save-media.ts", "utf8");
  const android = readFileSync("android/app/src/main/java/app/zunoza/mobile/MainActivity.java", "utf8");
  const shell = readFileSync("src/lib/zunoza/native-shell.ts", "utf8");
  assert.match(save, /shareNativeFile/);
  assert.match(save, /saveMediaFromUrl/);
  assert.doesNotMatch(android, /pauseTimers/);
  assert.doesNotMatch(android, /getWebView\(\)\.onPause/);
  assert.match(android, /CookieManager\.getInstance\(\)\.flush/);
  assert.match(shell, /appStateChange/);
});

test("credits are not charged twice for the same video poll", () => {
  const api = readFileSync("src/lib/zunoza/api.ts", "utf8");
  assert.match(api, /debitJobCredits/);
  assert.match(api, /shouldPollProvider/);
  const pollBlock = api.slice(api.indexOf("async function pollXai"), api.indexOf("async function refundJob"));
  assert.doesNotMatch(pollBlock, /method: "POST"/);
});
