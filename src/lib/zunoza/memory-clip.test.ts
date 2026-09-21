import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import {
  MEMORY_MOTIONS,
  MEMORY_NEGATIVE,
  aspectFromSize,
  buildMemoryClipPrompt,
  isMemoryMotion,
  memoryCreateError,
  memoryJobId,
  memoryProviderSeconds,
} from "./memory-clip.ts";

const home = readFileSync(new URL("../../routes/index.tsx", import.meta.url), "utf8");
const page = readFileSync(new URL("../../routes/anilar.tsx", import.meta.url), "utf8");

test("memory motions and identity lock stay in the prompt", () => {
  assert.equal(MEMORY_MOTIONS.length, 5);
  assert.equal(isMemoryMotion("gulumse"), true);
  assert.equal(MEMORY_MOTIONS[4]?.label, "Kameraya Bakış");
  const prompt = buildMemoryClipPrompt("gulumse", 5);
  assert.match(prompt, /IMAGE-TO-VIDEO/);
  assert.match(prompt, /Gülümseme/);
  assert.match(prompt, /IDENTITY LOCK/);
  assert.match(prompt, /SILENT/);
  assert.match(MEMORY_NEGATIVE, /face morph/);
  assert.equal(memoryProviderSeconds(3), 5);
  assert.equal(memoryProviderSeconds(5), 5);
  assert.equal(memoryProviderSeconds(10), 10);
  assert.equal(memoryProviderSeconds(15), 15);
  assert.match(buildMemoryClipPrompt("dogal", 10), /Duration: 10 seconds/);
  assert.equal(aspectFromSize(1080, 1920), "9:16");
  assert.equal(aspectFromSize(1920, 1080), "16:9");
});

test("create response unwraps job id and surfaces real errors", () => {
  assert.equal(memoryJobId({ id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee" }).length > 8, true);
  assert.equal(memoryJobId({ result: { id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee" } }).length > 8, true);
  assert.equal(memoryJobId({ sceneIds: ["aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"] }).length > 8, true);
  assert.equal(memoryJobId(undefined), "");
  assert.equal(memoryCreateError(new Error("Fotoğraf yükleyin.")), "Fotoğraf yükleyin.");
  assert.equal(memoryCreateError({ message: "yetersiz kredi" }), "yetersiz kredi");
});

test("home banner and studio call the real video job, not a fake result", () => {
  assert.match(home, /Anılarını Canlandır/);
  assert.match(home, /Eski fotoğraflarına yeniden hayat ver/);
  assert.match(home, /Fotoğraftan videoya/);
  assert.match(home, /to="\/anilar"/);
  assert.match(home, /tool-banner/);
  assert.doesNotMatch(home, /to: "\/dizi"/);
  assert.match(page, /createVideoJob/);
  assert.match(page, /quoteVideo/);
  assert.match(page, /sendingRef/);
  assert.match(page, /Anımı Canlandır/);
  assert.match(page, /İndir/);
  assert.match(page, /Tekrar Oluştur/);
  assert.match(page, /Başka Fotoğraf Seç/);
  assert.match(page, /Anınız canlandırılıyor/);
  assert.match(page, /sourceKind: "gorsel"/);
  assert.match(page, /voiceMode: "sessiz"/);
  assert.doesNotMatch(page, /durationSeconds: 3/);
  assert.match(page, /memory-seconds/);
  assert.match(page, /MEMORY_SECONDS/);
  assert.doesNotMatch(page, /DEMO_VIDEO/);
});
