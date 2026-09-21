import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const builder = readFileSync(new URL("./builder.ts", import.meta.url), "utf8");
const lock = readFileSync(new URL("./builder-lock.ts", import.meta.url), "utf8");
const agent = readFileSync(new URL("./builder-agent.ts", import.meta.url), "utf8");
const sanitize = readFileSync(new URL("./builder-sanitize.ts", import.meta.url), "utf8");
const files = readFileSync(new URL("./builder-files.ts", import.meta.url), "utf8");
const preview = readFileSync(new URL("../../components/builder-preview.tsx", import.meta.url), "utf8");
const start = readFileSync(new URL("../../routes/insa-et.tsx", import.meta.url), "utf8");
const work = readFileSync(new URL("../../routes/insa-et_.$projectId.tsx", import.meta.url), "utf8");
const stream = readFileSync(new URL("./builder-stream.ts", import.meta.url), "utf8");
const css = readFileSync(new URL("../../styles.css", import.meta.url), "utf8");
const migration = readFileSync(new URL("../../../migrations/0030_builder_agent_caps.sql", import.meta.url), "utf8");
const migration42 = readFileSync(new URL("../../../migrations/0042_builder_queue_status.sql", import.meta.url), "utf8");
const admin = readFileSync(new URL("./admin.ts", import.meta.url), "utf8");

test("builder charges before the model, refunds on failure, and writes cost ledger", () => {
  assert.match(builder, /chargeCredits/);
  assert.match(builder, /refundByJob/);
  assert.match(builder, /assertSpendCap/);
  assert.match(builder, /assertNotDuplicate/);
  assert.match(builder, /assertNoActiveBuilderJob/);
  assert.match(builder, /recordBuilderSpend/);
  assert.match(builder, /writeCostLedger|logAiUsage/);
  assert.match(builder, /status = \${"repairing"}/);
  assert.doesNotMatch(builder, /sadeleştirip tekrar deneyin/);
  assert.match(builder, /publicBuilderFailMessage/);
  assert.match(builder, /unlimited/);
  assert.match(builder, /isUnlimitedUser/);
  assert.ok(builder.indexOf("chargeCredits") < builder.indexOf("continueJob(context.userId, projectId)"));
  assert.match(builder, /İnşa Et iadesi/);
  assert.match(builder, /status <> \$\{"completed"\} and status <> \$\{"failed"\}/);
  assert.match(builder, /status <> \$\{"hazir"\}/);
  assert.match(builder, /async function jobWasStopped/);
  assert.match(builder, /if \(await jobWasStopped\(sql, job.id\)\) return;/);
});

test("agent hard caps, lock, and stale generating recovery stay in place", () => {
  assert.match(lock, /BUILDER_LOCK_MS = 180_000/);
  assert.match(lock, /shouldResetStaleGenerating/);
  assert.match(agent, /BUILDER_MAX_API_CALLS = 8/);
  assert.match(agent, /BUILDER_JOB_DEADLINE_MS/);
  assert.match(agent, /BUILDER_USER_CONCURRENT = 1/);
  assert.match(builder, /jobExceededDeadline/);
  assert.match(builder, /jobExceededCaps/);
  assert.match(builder, /builderLockHeld/);
  assert.match(builder, /BUILDER_KICK_STEPS/);
  assert.match(migration, /api_calls/);
  assert.match(migration, /tick_count/);
  assert.match(migration, /credits_charged/);
});

test("sandbox blocks parent escape, network, and secrets", () => {
  assert.match(preview, /sandbox="allow-scripts"/);
  assert.match(preview, /allow=""/);
  assert.equal(preview.includes("allow-same-origin"), false);
  assert.equal(preview.includes("allow-popups"), false);
  assert.match(preview, /referrerPolicy="no-referrer"/);
  assert.match(sanitize, /connect-src 'none'/);
  assert.match(sanitize, /<base/);
  assert.match(sanitize, /srcdoc/);
  assert.match(files, /XAI_API_KEY/);
  assert.match(builder, /ignore previous instructions/);
  assert.match(builder, /ownProject/);
  assert.match(builder, /buildPreviewDocument/);
  assert.match(builder, /user_id = \$\{userId\}/);
});

test("İnşa Et project cards can permanently delete from a three-dot menu", () => {
  assert.match(start, /Proje menüsü/);
  assert.match(start, /Projeyi Sil/);
  assert.match(start, /Bu projeyi kalıcı olarak silmek istediğinize emin misiniz\? Bu işlem geri alınamaz/);
  assert.match(start, /deleteBuilderProject/);
  assert.match(start, /confirm: "sil"/);
  assert.match(start, /alertdialog/);
  assert.match(start, /Yeniden adlandır/);
  assert.match(start, /Ço
... 