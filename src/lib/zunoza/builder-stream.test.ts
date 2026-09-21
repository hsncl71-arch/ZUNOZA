import assert from "node:assert/strict";
import test from "node:test";
import { builderPreviewUnlocked, isCannedBuilderStage, mergeBuilderStream } from "./builder-stream.ts";

test("canned stage board labels never enter the stream", () => {
  assert.equal(isCannedBuilderStage("İstek analiz ediliyor"), true);
  assert.equal(isCannedBuilderStage("Ajan çalışıyor"), true);
  assert.equal(isCannedBuilderStage("Son güncelleme 4 sn önce"), true);
  assert.equal(isCannedBuilderStage("İstek analiz edildi."), false);
});

test("preview stays locked while the agent or queue is still working", () => {
  assert.equal(
    builderPreviewUnlocked({ running: true, html: "<html></html>", version: 1, queue: [] }),
    false,
  );
  assert.equal(
    builderPreviewUnlocked({
      running: false,
      pending: "renkleri değiştir",
      html: "<html></html>",
      version: 1,
      queue: [],
    }),
    false,
  );
  assert.equal(
    builderPreviewUnlocked({
      running: false,
      html: "<html></html>",
      version: 1,
      queue: [{ status: "queued" }],
    }),
    false,
  );
  assert.equal(
    builderPreviewUnlocked({
      running: false,
      html: "<html></html>",
      version: 1,
      queue: [{ status: "completed" }],
    }),
    true,
  );
});

test("stream keeps old work after a new prompt and never paints a status board", () => {
  const first = mergeBuilderStream([], {
    projectId: "p1",
    messages: [{ id: "m1", role: "user", content: "Restoran rezervasyonu yap" }],
    activity: [],
    running: true,
    stepLabel: "İstek analiz ediliyor",
    version: 0,
    html: null,
  });
  assert.equal(first.some((i) => i.kind === "user"), true);
  assert.equal(first.some((i) => i.text === "Düşünülüyor…"), true);
  assert.equal(first.some((i) => /Ajan çalışıyor|İstek analiz ediliyor|Kod oluşturuluyor/.test(i.text)), false);
  assert.equal(first.some((i) => i.kind === "preview"), false);

  const after = mergeBuilderStream(first, {
    projectId: "p1",
    messages: [
      { id: "m1", role: "user", content: "Restoran rezervasyonu yap" },
      { id: "m2", role: "user", content: "Menüyü daha premium yap" },
    ],
    activity: ["İstek analiz edildi.", "Arayüz bileşenleri bağlandı."],
    running: true,
    stepLabel: "Testler çalıştırılıyor",
    html: "<html></html>",
    version: 1,
    queue: [{ id: "q1", instruction: "Mobil taşmayı düzelt", status: "queued" }],
  });
  assert.ok(after.some((i) => i.text.includes("Restoran")));
  assert.ok(after.some((i) => i.text.includes("İstek analiz edildi")));
  assert.ok(after.some((i) => i.text.includes("Menüyü daha premium")));
  assert.ok(after.some((i) => i.kind === "queue" && /SIRADA/.test(i.text)));
  assert.equal(after.filter((i) => i.kind === "preview").length, 0);
  assert.equal(after.some((i) => i.text === "Testler çalıştırılıyor"), false);
  assert.equal(after.some((i) => i.text === "Düşünülüyor…"), false);

  const done = mergeBuilderStream(after, {
    projectId: "p1",
    messages: [
      { id: "m1", role: "user", content: "Restoran rezervasyonu yap" },
      { id: "m2", role: "user", content: "Menüyü daha premium yap" },
    ],
    activity: ["İstek analiz edildi.", "Arayüz bileşenleri bağlandı."],
    running: false,
    html: "<html></html>",
    version: 1,
    queue: [{ id: "q1", instruction: "Mobil taşmayı düzelt", status: "completed" }],
  });
  assert.equal(done.filter((i) => i.kind === "preview").length, 1);

  const sending = mergeBuilderStream(done, {
    projectId: "p1",
    messages: [
      { id: "m1", role: "user", content: "Restoran rezervasyonu yap" },
      { id: "m2", role: "user", content: "Menüyü daha premium yap" },
    ],
    activity: ["İstek analiz edildi.", "Arayüz bileşenleri bağlandı."],
    running: false,
    pending: "renkleri değiştir",
    html: "<html></html>",
    version: 1,
    queue: [{ id: "q1", instruction: "Mobil taşmayı düzelt", status: "completed" }],
  });
  assert.equal(sending.filter((i) => i.kind === "preview").length, 0);
});
