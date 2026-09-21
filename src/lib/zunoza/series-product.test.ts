import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const series = readFileSync(new URL("./series.ts", import.meta.url), "utf8");
const plan = readFileSync(new URL("./series-plan.ts", import.meta.url), "utf8");
const olustur = readFileSync(new URL("../../routes/olustur.tsx", import.meta.url), "utf8");
const home = readFileSync(new URL("../../routes/index.tsx", import.meta.url), "utf8");
const menu = readFileSync(new URL("../../components/side-menu.tsx", import.meta.url), "utf8");
const projects = readFileSync(new URL("../../routes/projeler.tsx", import.meta.url), "utf8");

test("series never invents a clip longer than 15 seconds", () => {
  assert.match(plan, /EPISODE_SECONDS = \[60, 90, 120, 180, 240, 300\]/);
  assert.match(plan, /shots.push\(15\)/);
  assert.doesNotMatch(plan, /durationSeconds: 30/);
  assert.match(series, /startUserVideoJob/);
  assert.match(series, /retrySeriesScene/);
  assert.match(series, /sahte montaj üretilmez/);
  assert.doesNotMatch(series, /durationSeconds: 30/);
});

test("completed episode is delivered as one cut-together MP4", () => {
  assert.match(series, /concatMp4Buffers/);
  assert.match(series, /renderMontageProject/);
  assert.match(series, /ensureEpisodeMerged/);
  assert.match(series, /retrySeriesMerge/);
  assert.match(series, /transition: "cut"/);
  assert.doesNotMatch(series, /transition: "fade"/);
  assert.match(series, /provider = \$\{"ffmpeg"\}/);
  assert.match(olustur, /const DURATIONS = \[5, 10, 15\]/);
});
test("season continuity is mandatory through episode 50", () => {
  assert.match(plan, /MAX_SERIES_EPISODES = 50/);
  assert.match(plan, /DEFAULT_EPISODE_SECONDS: EpisodeSeconds = 300/);
  assert.match(plan, /ZORUNLU SÜREKLİLİK/);
  assert.match(plan, /identityLocked/);
  assert.match(series, /assertSeriesEpisodeSlot/);
  assert.match(series, /updateSeriesIdentity/);
  assert.match(series, /referenceImages/);
  assert.match(series, /lastSceneBeat/);
  assert.match(series, /seasonMemory/);
});

test("series does not call extend/edit APIs and enforces a generation budget", () => {
  assert.doesNotMatch(series, /videos\/extensions/);
  assert.doesNotMatch(series, /videos\/edits/);
  assert.match(series, /applySeriesBudget/);
  assert.match(series, /limit_asildi/);
  assert.match(series, /extendAvailable: false/);
});

test("single-clip studio stays 5/10/15 and series UI is removed", () => {
  assert.match(olustur, /const DURATIONS = \[5, 10, 15\]/);
  assert.doesNotMatch(olustur, /30 saniye/);
  assert.match(home, /to: "\/kapak"/);
  assert.doesNotMatch(home, /to: "\/dizi"/);
  assert.doesNotMatch(menu, /to: "\/dizi"/);
  assert.doesNotMatch(menu, /Dizi \/ Uzun Video/);
  assert.doesNotMatch(projects, /Dizi \/ Uzun Video/);
  assert.doesNotMatch(projects, /to: "\/dizi"/);
});
