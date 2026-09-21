import assert from "node:assert/strict";
import test from "node:test";
import {
  builderTaskLabel,
  canMutateQueuedTask,
  completeActiveBuilderTask,
  enqueueBuilderTask,
  mutateQueuedBuilderTask,
  queuedCountForCap,
} from "./builder-queue.ts";

test("five prompts while a job is active stay ordered and auto-start", () => {
  let tasks = enqueueBuilderTask([], "İlk görev: giriş ekranı", 16);
  assert.equal(tasks[0].status, "active");
  assert.equal(builderTaskLabel(tasks[0].status), "AKTİF");
  const prompts = [
    "Kayıt ekranını premium yap",
    "Mobil menüyü düzelt",
    "Dashboard kartları ekle",
    "Ayarlar sayfası ekle",
    "Profil sayfasını bağla",
  ];
  for (const prompt of prompts) tasks = enqueueBuilderTask(tasks, prompt, 16);
  assert.equal(queuedCountForCap(tasks), 5);
  assert.equal(tasks.filter((t) => t.status === "active").length, 1);
  assert.deepEqual(
    tasks.filter((t) => t.status === "queued").map((t) => t.instruction),
    prompts,
  );

  const edited = mutateQueuedBuilderTask(tasks, tasks[2].id, "save", "Mobil menüyü hamburger yap");
  assert.equal(edited[2].instruction, "Mobil menüyü hamburger yap");
  const moved = mutateQueuedBuilderTask(edited, edited[2].id, "down");
  assert.ok(moved[2].sortOrder > moved[3].sortOrder || moved[2].sortOrder !== edited[2].sortOrder);
  const deleted = mutateQueuedBuilderTask(moved, moved[5].id, "delete");
  assert.equal(deleted.some((t) => t.instruction.includes("Profil")), false);

  const order: string[] = [];
  let cursor = deleted;
  while (cursor.some((t) => t.status === "active" || t.status === "queued")) {
    const active = cursor.find((t) => t.status === "active");
    if (!active) break;
    order.push(active.instruction);
    cursor = completeActiveBuilderTask(cursor);
  }
  assert.equal(order[0], "İlk görev: giriş ekranı");
  assert.ok(order.includes("Mobil menüyü hamburger yap"));
  assert.equal(order.includes("Profil sayfasını bağla"), false);
  assert.equal(cursor.filter((t) => t.status === "completed").length, order.length);
  assert.equal(cursor.some((t) => t.status === "active" || t.status === "queued"), false);
});

test("failed active task still starts the next queued prompt", () => {
  let tasks = enqueueBuilderTask([], "Aktif iş", 16);
  tasks = enqueueBuilderTask(tasks, "Sıradaki iş", 16);
  tasks = completeActiveBuilderTask(tasks, "Model yanıt vermedi.");
  assert.equal(tasks[0].status, "failed");
  assert.equal(builderTaskLabel(tasks[0].status), "HATA");
  assert.equal(tasks[1].status, "active");
  assert.equal(canMutateQueuedTask("active"), false);
  assert.equal(canMutateQueuedTask("queued"), true);
});
