import assert from "node:assert/strict";
import test from "node:test";
import { nextPollDelay, providerPollDue } from "./perf.ts";
import {
  beginPersist,
  circuitAllow,
  circuitFail,
  circuitOk,
  circuitOpen,
  claimIdempotency,
  endPersist,
  isTransientProviderError,
  shouldPollProvider,
} from "./resilience.ts";
import { selectRelevantMemories, type MemoryPick } from "./memory-select.ts";

test("poll delay backs off without stalling the job", () => {
  assert.equal(nextPollDelay(0, 3000, 8000), 3000);
  assert.ok(nextPollDelay(1, 3000, 8000) > 3000);
  assert.equal(nextPollDelay(8, 3000, 8000), 8000);
});

test("completed-style provider poll is skipped inside the min window", () => {
  const now = 1_000_000;
  assert.equal(providerPollDue(now - 1000, now, 5000), false);
  assert.equal(providerPollDue(now - 6000, now, 5000), true);
  assert.equal(shouldPollProvider("job-a", 5000, now), true);
  assert.equal(shouldPollProvider("job-a", 5000, now + 400), false);
  assert.equal(shouldPollProvider("job-a", 5000, now + 6000), true);
});

test("persist lock prevents duplicate full-file transfers", () => {
  assert.equal(beginPersist("v1"), true);
  assert.equal(beginPersist("v1"), false);
  endPersist("v1");
  assert.equal(beginPersist("v1"), true);
  endPersist("v1");
});

test("circuit opens after repeated provider faults and does not fake success", () => {
  const name = "xai-test";
  circuitOk(name);
  circuitFail(name, new Error("502"));
  circuitFail(name, new Error("timeout"));
  circuitFail(name, new Error("503"));
  assert.equal(circuitOpen(name), true);
  assert.throws(() => circuitAllow(name), /geçici/);
  circuitOk(name);
  assert.equal(circuitOpen(name), false);
});

test("idempotency claim drops duplicate usage rows", () => {
  assert.equal(claimIdempotency("video:abc"), true);
  assert.equal(claimIdempotency("video:abc"), false);
  assert.equal(claimIdempotency("video:other"), true);
});

test("transient detector keeps auth errors loud", () => {
  assert.equal(isTransientProviderError(new Error("502 Bad Gateway")), true);
  assert.equal(isTransientProviderError(new Error("401 unauthorized")), false);
});

test("relevant memories do not pad the prompt with unrelated notes", () => {
  const rows: MemoryPick[] = [
    { id: "1", content: "Kullanıcının adı Hasan Öcal", createdAt: "2026-09-01" },
    { id: "2", content: "Kullanıcının şirketi Öz Öcal Tesbihçilik", createdAt: "2026-09-02" },
    { id: "3", content: "Sevdiğim renk lacivert", createdAt: "2026-09-03" },
    { id: "4", content: "Köpeğimin adı Pamuk", createdAt: "2026-09-04" },
    { id: "5", content: "Tatil planı Kapadokya", createdAt: "2026-09-05" },
    { id: "6", content: "Toplantı notu: fatura", createdAt: "2026-09-06" },
    { id: "7", content: "Favori kahve: sade", createdAt: "2026-09-07" },
    { id: "8", content: "Araba plakası kayıtlı değil", createdAt: "2026-09-08" },
    { id: "9", content: "Spor salonu salı perşembe", createdAt: "2026-09-09" },
  ];
  const picked = selectRelevantMemories(rows, "merhaba nasılsın");
  assert.ok(picked.some((row) => /Hasan Öcal/.test(row.content)));
  assert.ok(picked.length <= 4);
  assert.equal(
    picked.some((row) => /Kapadokya|fatura|kahve|plaka|spor salonu/i.test(row.content)),
    false,
  );
  const color = selectRelevantMemories(rows, "lacivert rengi kullan");
  assert.ok(color.some((row) => /lacivert/.test(row.content)));
  assert.ok(color.some((row) => /Hasan Öcal/.test(row.content)));
});
