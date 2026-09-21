import assert from "node:assert/strict";
import test from "node:test";
import {
  BUILDER_JOB_DEADLINE_MS,
  BUILDER_MAX_API_CALLS,
  BUILDER_MAX_RETRY,
  BUILDER_MAX_TICKS,
  BUILDER_USER_CONCURRENT,
  BUILDER_QUEUE_MAX,
  builderJobKindLabel,
  builderStepIndex,
  builderStepTone,
  jobExceededCaps,
  jobExceededDeadline,
  publicBuilderFailMessage,
} from "./builder-agent.ts";

test("deadline only fires after the hard wall clock", () => {
  const now = 10_000_000;
  assert.equal(jobExceededDeadline({ created_at: new Date(now - 60_000).toISOString() }, now), false);
  assert.equal(
    jobExceededDeadline({ created_at: new Date(now - BUILDER_JOB_DEADLINE_MS - 1).toISOString() }, now),
    true,
  );
  assert.equal(jobExceededDeadline({}, now), false);
});

test("api/tick/retry caps stop runaway agent loops", () => {
  assert.equal(jobExceededCaps({ api_calls: 0, tick_count: 0, retry_count: 0 }), false);
  assert.equal(jobExceededCaps({ api_calls: BUILDER_MAX_API_CALLS, tick_count: 1, retry_count: 0 }), true);
  assert.equal(jobExceededCaps({ api_calls: 1, tick_count: BUILDER_MAX_TICKS, retry_count: 0 }), true);
  assert.equal(jobExceededCaps({ api_calls: 1, tick_count: 1, retry_count: BUILDER_MAX_RETRY + 1 }), true);
  assert.equal(BUILDER_USER_CONCURRENT, 1);
  assert.equal(BUILDER_QUEUE_MAX, 16);
  assert.ok(BUILDER_MAX_API_CALLS <= 8);
  assert.equal(BUILDER_MAX_API_CALLS, 8);
});

test("step index and labels stay user-facing", () => {
  assert.equal(builderStepIndex("analyzing"), 0);
  assert.equal(builderStepIndex("completed"), 9);
  assert.equal(builderStepIndex("failed"), 0);
  assert.equal(builderJobKindLabel("edit", "completed"), "Tamamlandı");
  assert.equal(builderJobKindLabel("create", "planning"), "Oluşturma");
  assert.equal(builderStepTone("planning", "analyzing"), "done");
  assert.equal(builderStepTone("planning", "planning"), "run");
  assert.equal(builderStepTone("planning", "testing"), "wait");
  assert.equal(builderStepTone("completed", "previewing"), "done");
  assert.equal(builderStepTone("repairing", "repairing"), "run");
  assert.equal(builderStepTone("testing", "repairing", { retries: 1 }), "done");
  assert.equal(builderStepTone("failed", "testing", { failedStep: "testing" }), "err");
});

test("public fail messages stay specific and never ask to simplify", () => {
  assert.match(publicBuilderFailMessage(["Kaynakta gizli anahtar izi bulundu"]), /güvenlik/i);
  assert.match(publicBuilderFailMessage(["Buton veya form var ama çalışan bir etkileşim bulunamadı."]), /çalışırlık/i);
  assert.equal(/sadeleştir/i.test(publicBuilderFailMessage([])), false);
});
