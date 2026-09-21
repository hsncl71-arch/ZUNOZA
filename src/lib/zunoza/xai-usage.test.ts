import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { parseXaiUsage, ticksToUsd, XAI_TICKS_PER_USD, mergeXaiUsage, emptyXaiUsage } from "./xai-usage.ts";

test("xAI ticks convert with official 1 USD = 10_000_000_000", () => {
  assert.equal(XAI_TICKS_PER_USD, 10_000_000_000);
  assert.equal(ticksToUsd(37_756_000), 0.0037756);
  assert.equal(ticksToUsd(400_000_000), 0.04);
  const usage = parseXaiUsage({ usage: { cost_in_usd_ticks: 400000000, prompt_tokens: 12, completion_tokens: 3 } });
  assert.equal(usage.source, "xai_ticks");
  assert.equal(usage.usd, 0.04);
  assert.equal(usage.inputTokens, 12);
  assert.equal(usage.outputTokens, 3);
});

test("missing usage is unverified and never invents a dollar amount", () => {
  const empty = parseXaiUsage({ status: "done", video: { url: "https://example" } });
  assert.equal(empty.source, "unverified");
  assert.equal(empty.usd, null);
  assert.equal(empty.ticks, null);
  const merged = mergeXaiUsage(emptyXaiUsage(), empty);
  assert.equal(merged.source, "unverified");
});

test("video poll and chat log actual ticks when present; admin cap is not skipped", () => {
  const api = readFileSync("src/lib/zunoza/api.ts", "utf8");
  const cap = readFileSync("src/lib/zunoza/cost-cap.ts", "utf8");
  const stream = readFileSync("src/lib/zunoza/assistant-stream.server.ts", "utf8");
  const images = readFileSync("src/lib/zunoza/images.ts", "utf8");
  const ledger = readFileSync("src/lib/zunoza/cost-ledger.ts", "utf8");
  assert.match(api, /parseXaiUsage/);
  assert.match(api, /xaiLogFields\(poll\.usage\)/);
  assert.match(stream, /mergeXaiUsage/);
  assert.match(images, /parseXaiUsage\(json\)/);
  assert.match(ledger, /cost_source = 'xai_ticks'/);
  assert.match(ledger, /on conflict \(job_id, feature\)/);
  const fn = cap.slice(cap.indexOf("export async function assertSpendCap"));
  assert.doesNotMatch(fn, /isUnlimitedUser\(sql, ctx\.userId\)\) return;/);
});
