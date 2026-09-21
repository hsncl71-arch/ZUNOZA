import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { inspectLiveServices, storeIapRemainingGaps } from "./live-services.ts";
import { STORE_BILLING_READY } from "./store-billing.ts";

test("inspect marks shotstack production missing when only a stage key exists", () => {
  const rows = inspectLiveServices({
    SHOTSTACK_API_KEY: "stage-key",
    SHOTSTACK_ENV: "stage",
    XAI_API_KEY: "x",
    ELEVENLABS_API_KEY: "e",
    DATABASE_URL: "postgres://x",
    IYZICO_API_KEY: "live-key",
    IYZICO_SECRET_KEY: "secret",
    GROK_AUTH_CLIENT_ID: "cid",
    GROK_AUTH_CLIENT_SECRET: "csec",
    APPLE_CLIENT_ID: "com.zunoza.app.web",
    APPLE_CLIENT_SECRET: "jwt",
  });
  assert.equal(rows.find((r) => r.id === "shotstack-prod")?.state, "stage");
  assert.equal(rows.find((r) => r.id === "xai")?.state, "anahtar-var");
  assert.equal(rows.find((r) => r.id === "apple-signin")?.state, "anahtar-var");
  assert.equal(rows.find((r) => r.id === "google-signin")?.state, "anahtar-var");
  assert.equal(rows.find((r) => r.id === "app-store-iap")?.state, "kapali");
  assert.equal(rows.find((r) => r.id === "play-billing")?.state, "kapali");
  assert.equal(rows.find((r) => r.id === "iyzico-live")?.state, "anahtar-var");
});

test("sandbox iyzico is not reported as live", () => {
  const rows = inspectLiveServices({
    IYZICO_API_KEY: "sandbox-xxxx",
    IYZICO_SECRET_KEY: "secret",
  });
  assert.equal(rows.find((r) => r.id === "iyzico-live")?.state, "stage");
});

test("IAP stays closed and lists remaining account gaps", () => {
  assert.equal(STORE_BILLING_READY, false);
  const gaps = storeIapRemainingGaps({});
  assert.equal(gaps.closed, true);
  assert.equal(gaps.appleApi, false);
  assert.equal(gaps.googleApi, false);
  assert.ok(gaps.todos.length >= 8);
  assert.ok(gaps.missingEnv.some((row) => row.includes("APPLE_IAP")));
  assert.ok(gaps.missingEnv.some((row) => row.includes("GOOGLE_PLAY")));
});

test("download routes stream R2 video instead of buffering the whole object", () => {
  const video = readFileSync("src/routes/api/videolar.$jobId.indir.ts", "utf8");
  const montage = readFileSync("src/routes/api/montajlar.$projectId.indir.ts", "utf8");
  const vitrin = readFileSync("src/routes/api/vitrin.$clipId.ts", "utf8");
  const upload = readFileSync("src/routes/api/yuklemeler.$uploadId.indir.ts", "utf8");
  const stream = readFileSync("src/lib/zunoza/media-stream.ts", "utf8");
  const r2 = readFileSync("src/lib/zunoza/r2.ts", "utf8");
  for (const src of [video, montage, vitrin, upload]) {
    assert.match(src, /serveStoredVideo/);
    assert.doesNotMatch(src, /getR2ObjectRange/);
  }
  assert.match(stream, /streamR2Object/);
  assert.match(stream, /pipeVideoResponse/);
  assert.match(r2, /export async function streamR2Object/);
  const start = r2.indexOf("export async function streamR2Object");
  const next = r2.indexOf("export async function headR2Object");
  assert.doesNotMatch(r2.slice(start, next > start ? next : undefined), /arrayBuffer\(\)/);
});
