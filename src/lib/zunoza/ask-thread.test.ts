import assert from "node:assert/strict";
import test from "node:test";
import { lastUserIndex, slimAskMessages, applyAskDelta, askSendKey, lastDataImage, extractSourceUrls, liveContextFromThread, isAskAttachmentPath, preserveAskImages, persistableAskMessages, attachStoredAskImages } from "./ask-thread.ts";
import { isForgetCommand, isSensitiveMemory, looksLikeMemoryCommand } from "./memory-intent.ts";

test("slim thread keeps only recent images", () => {
  const rows = slimAskMessages(
    [
      { role: "user", content: "eski", images: ["data:image/jpeg;base64,aaa"] },
      { role: "assistant", content: "ok" },
      { role: "user", content: "yeni", images: ["data:image/jpeg;base64,bbb"] },
      { role: "assistant", content: "tamam" },
    ],
    2,
  );
  assert.equal(rows[0]?.images, undefined);
  assert.equal(rows[2]?.images?.[0]?.includes("bbb"), true);
  assert.equal(lastUserIndex(rows), 2);
});

test("forget phrases are memory commands and not save cues", () => {
  assert.equal(isForgetCommand("Şunu unut"), true);
  assert.equal(isForgetCommand("Bunu unut"), true);
  assert.equal(isForgetCommand("unut bunu"), true);
  assert.equal(looksLikeMemoryCommand("Şunu unut"), true);
  assert.equal(looksLikeMemoryCommand("Neleri hatırlıyorsun?"), true);
  assert.equal(isForgetCommand("Bunu unutma"), false);
  assert.equal(looksLikeMemoryCommand("Bunu hatırla: adım Hasan Öcal"), true);
});

test("sensitive secrets are not treated as savable notes", () => {
  assert.equal(isSensitiveMemory("şifrem 123456"), true);
  assert.equal(isSensitiveMemory("IBAN TR120006200000000000000000"), true);
  assert.equal(isSensitiveMemory("kart no 4111111111111111"), true);
  assert.equal(isSensitiveMemory("tc kimlik 12345678901"), true);
  assert.equal(isSensitiveMemory("emailim ali@example.com"), true);
  assert.equal(isSensitiveMemory("private key abcdef"), true);
  assert.equal(isSensitiveMemory("Adım Hasan Öcal"), false);
});

test("streaming delta appends after the user turn instead of rewriting history", () => {
  const start = [
    { role: "assistant" as const, content: "Merhaba" },
    { role: "user" as const, content: "2+2" },
  ];
  const first = applyAskDelta(start, "4");
  assert.equal(first[0]?.content, "Merhaba");
  assert.equal(first[2]?.content, "4");
  const second = applyAskDelta(first, "4 eder.");
  assert.equal(second.length, 3);
  assert.equal(second[2]?.content, "4 eder.");
});

test("duplicate send keys collapse the same turn", () => {
  assert.equal(askSendKey("Merhaba", []), askSendKey("  merhaba  ", []));
  assert.notEqual(askSendKey("Merhaba", ["data:image/jpeg;base64,x"]), askSendKey("Merhaba", []));
});

test("last attached data image is recovered for follow-up edits", () => {
  const rows = [
    { role: "user" as const, content: "bak", images: ["data:image/jpeg;base64,abc"] },
    { role: "assistant" as const, content: "gördüm" },
  ];
  assert.equal(lastDataImage(rows)?.startsWith("data:image/"), true);
  assert.deepEqual(extractSourceUrls("Kaynak: https://example.com/a ve https://x.ai/b"), [
    "https://example.com/a",
    "https://x.ai/b",
  ]);
});

test("live context shares written turns and photo analysis with voice", () => {
  const ctx = liveContextFromThread([
    { role: "assistant", content: "Merhaba, ben ZUNOZA. Yapay zekâ asistanınızım. Size nasıl yardımcı olabilirim?" },
    { role: "user", content: "Bu fotoğrafta ne var?", images: ["data:image/jpeg;base64,abc"] },
    { role: "assistant", content: "Kırmızı bir spor otomobil." },
  ]);
  assert.equal(ctx.hasImage, true);
  assert.equal(ctx.lastImageAnalyzed, true);
  assert.match(ctx.text, /Kırmızı bir spor otomobil/);
  assert.match(ctx.text, /AYNI konuşma/);
  assert.match(ctx.text, /göremiyorum/);
  assert.equal(isAskAttachmentPath("/api/sor-ekler/abc-1/indir"), true);
  assert.equal(isAskAttachmentPath("https://evil.example/x"), false);
});

test("live context without photo stays compact and does not invent vision", () => {
  const ctx = liveContextFromThread([
    { role: "user", content: "İstanbul hava nasıl?" },
    { role: "assistant", content: "Bugün parçalı bulutlu." },
  ]);
  assert.equal(ctx.hasImage, false);
  assert.equal(ctx.lastImageAnalyzed, false);
  assert.match(ctx.text, /İstanbul hava/);
});

test("later persist without data URLs keeps saved attachment paths", () => {
  const existing = [
    { role: "user" as const, content: "Bu fotoğrafta ne var?", images: ["/api/sor-ekler/abc-1/indir"] },
    { role: "assistant" as const, content: "Kırmızı araba." },
  ];
  const incoming = [
    { role: "user" as const, content: "Bu fotoğrafta ne var?" },
    { role: "assistant" as const, content: "Kırmızı araba." },
    { role: "user" as const, content: "Rengi ne?" },
  ];
  const merged = preserveAskImages(incoming, existing);
  assert.deepEqual(merged[0]?.images, ["/api/sor-ekler/abc-1/indir"]);
  assert.equal(merged[2]?.images, undefined);
});

test("persistable messages keep recent data images for server snapshot", () => {
  const rows = persistableAskMessages([
    { role: "user", content: "Bu fotoğrafta ne var?", images: ["data:image/jpeg;base64,abc"] },
    { role: "assistant", content: "Kırmızı araba." },
  ]);
  assert.equal(rows[0]?.images?.[0]?.startsWith("data:image/"), true);
});

test("stored attachment paths replace bulky data URLs on the same turn", () => {
  const local = [
    { role: "user" as const, content: "Bu fotoğrafta ne var?", images: ["data:image/jpeg;base64,abc"] },
    { role: "assistant" as const, content: "Kırmızı araba." },
  ];
  const stored = [
    { role: "user" as const, content: "Bu fotoğrafta ne var?", images: ["/api/sor-ekler/abc-1/indir"] },
    { role: "assistant" as const, content: "Kırmızı araba." },
  ];
  const next = attachStoredAskImages(local, stored);
  assert.deepEqual(next[0]?.images, ["/api/sor-ekler/abc-1/indir"]);
  const ctx = liveContextFromThread(next);
  assert.equal(ctx.lastAttachmentId, "abc-1");
  assert.equal(ctx.hasImage, true);
});
