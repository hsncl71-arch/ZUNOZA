import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { builderLockHeld, shouldResetStaleGenerating } from "./builder-lock.ts";
import { friendlyClientError, hushRantReply } from "./client-error.ts";

test("generating job stays locked until lock expires", () => {
  const now = 1_000_000;
  assert.equal(
    builderLockHeld({ locked_until: new Date(now + 180_000).toISOString() }, now),
    true,
  );
  assert.equal(
    builderLockHeld({ locked_until: new Date(now - 1).toISOString() }, now),
    false,
  );
});

test("expired lock does not reset generating until heartbeat is stale", () => {
  const now = 5_000_000;
  const job = {
    status: "generating",
    locked_until: new Date(now - 1_000).toISOString(),
    updated_at: new Date(now - 30_000).toISOString(),
  };
  assert.equal(shouldResetStaleGenerating(job, now), false);
  assert.equal(
    shouldResetStaleGenerating(
      { ...job, updated_at: new Date(now - 210_000).toISOString() },
      now,
    ),
    true,
  );
});

test("completed jobs never look like stale generating", () => {
  assert.equal(
    shouldResetStaleGenerating({ status: "completed", locked_until: null, updated_at: new Date().toISOString() }),
    false,
  );
});

test("safari Load failed becomes a retryable turkish message", () => {
  assert.equal(friendlyClientError(new Error("Load failed")), "Bağlantı kesildi. Lütfen tekrar deneyin.");
  assert.equal(friendlyClientError(new Error("Failed to fetch")), "Bağlantı kesildi. Lütfen tekrar deneyin.");
  assert.equal(friendlyClientError(new Error("Unauthorized")), "Oturumunuz sona erdi. Lütfen tekrar giriş yapın.");
  assert.equal(
    friendlyClientError(new Error("yanıt vermedi (502)"), "Asistan yanıt veremedi."),
    "Asistan yanıt veremedi.",
  );
  assert.match(
    friendlyClientError(new Error("generation failed"), "İnşa başlatılamadı."),
    /Proje oluşturulurken/,
  );
});

test("rant replies do not announce a name correction", () => {
  assert.equal(hushRantReply("Anladım, düzeltiyorum. Başka?", true), "Anladım.");
  assert.equal(hushRantReply("4", false), "4");
});

test("builder iframe has no same-origin, popups, or parent navigation", () => {
  const src = readFileSync(new URL("../../components/builder-preview.tsx", import.meta.url), "utf8");
  assert.match(src, /sandbox="allow-scripts"/);
  assert.match(src, /allow=""/);
  assert.equal(src.includes("allow-same-origin"), false);
  assert.equal(src.includes("allow-popups"), false);
  assert.equal(src.includes("allow-top-navigation"), false);
});

test("copy and publish exist; publish requires confirm and issues a share slug", () => {
  const src = readFileSync(new URL("./builder.ts", import.meta.url), "utf8");
  assert.match(src, /export const copyBuilderProject/);
  assert.match(src, /export const publishBuilderProject/);
  assert.match(src, /if \(!data\.confirm\) throw/);
  assert.equal(/vercel deploy|npm run deploy/i.test(src), false);
  assert.match(src, /public_slug/);
  assert.match(src, /getPublishedBuilderApp/);
  assert.match(src, /published_at is not null/);
});

test("builder child tables cascade on project delete", () => {
  const sql = readFileSync(new URL("../../../migrations/0021_builder.sql", import.meta.url), "utf8");
  for (const table of ["builder_versions", "builder_messages", "builder_jobs", "builder_assets"]) {
    assert.match(sql, new RegExp(`${table}[\\s\\S]+references builder_projects\\(id\\) on delete cascade`, "i"));
  }
  const queue = readFileSync(new URL("../../../migrations/0041_builder_queue.sql", import.meta.url), "utf8");
  assert.match(queue, /builder_queue[\s\S]+references builder_projects\(id\) on delete cascade/i);
});

test("videolarim list uses placeholder thumbs not full mp4 blob", () => {
  const src = readFileSync(new URL("../../routes/videolarim.tsx", import.meta.url), "utf8");
  assert.match(src, /VideoThumb/);
  assert.equal(/<StudioVideo/.test(src), false);
});
