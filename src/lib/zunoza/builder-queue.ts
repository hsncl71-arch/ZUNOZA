export const BUILDER_TASK_QUEUED = "queued";
export const BUILDER_TASK_ACTIVE = "active";
export const BUILDER_TASK_COMPLETED = "completed";
export const BUILDER_TASK_FAILED = "failed";

export type BuilderTaskStatus =
  | typeof BUILDER_TASK_QUEUED
  | typeof BUILDER_TASK_ACTIVE
  | typeof BUILDER_TASK_COMPLETED
  | typeof BUILDER_TASK_FAILED;

export type BuilderTask = {
  id: string;
  instruction: string;
  status: BuilderTaskStatus;
  sortOrder: number;
  error?: string | null;
};

export function builderTaskLabel(status?: string | null) {
  if (status === BUILDER_TASK_ACTIVE) return "AKTİF";
  if (status === BUILDER_TASK_COMPLETED) return "TAMAMLANDI";
  if (status === BUILDER_TASK_FAILED) return "HATA";
  return "SIRADA";
}

export function canMutateQueuedTask(status?: string | null) {
  return status === BUILDER_TASK_QUEUED;
}

export function queuedCountForCap(items: { status: string }[]) {
  return items.filter((item) => item.status === BUILDER_TASK_QUEUED).length;
}

export function nextQueuedTask<T extends { status: string; sortOrder: number }>(items: T[]) {
  return items
    .filter((item) => item.status === BUILDER_TASK_QUEUED)
    .sort((a, b) => a.sortOrder - b.sortOrder)[0] ?? null;
}

export function enqueueBuilderTask(items: BuilderTask[], instruction: string, maxQueued: number): BuilderTask[] {
  const text = String(instruction || "").trim();
  if (text.length < 2) throw new Error("Görev metni çok kısa.");
  if (queuedCountForCap(items) >= maxQueued) throw new Error("Kuyruk doldu. Sıradakilerden birini silin.");
  const sortOrder = items.reduce((n, item) => Math.max(n, item.sortOrder), 0) + 1;
  const hasActive = items.some((item) => item.status === BUILDER_TASK_ACTIVE);
  return [
    ...items,
    {
      id: `bq_${items.length + 1}`,
      instruction: text.slice(0, 4000),
      status: hasActive ? BUILDER_TASK_QUEUED : BUILDER_TASK_ACTIVE,
      sortOrder,
    },
  ];
}

export function completeActiveBuilderTask(items: BuilderTask[], error?: string | null): BuilderTask[] {
  const next = items.map((item) => ({ ...item }));
  const active = next.find((item) => item.status === BUILDER_TASK_ACTIVE);
  if (!active) return next;
  active.status = error ? BUILDER_TASK_FAILED : BUILDER_TASK_COMPLETED;
  active.error = error || null;
  const queued = nextQueuedTask(next);
  if (queued) queued.status = BUILDER_TASK_ACTIVE;
  return next;
}

export function mutateQueuedBuilderTask(
  items: BuilderTask[],
  id: string,
  action: "save" | "delete" | "up" | "down",
  instruction?: string,
): BuilderTask[] {
  const next = items.map((item) => ({ ...item }));
  const at = next.findIndex((item) => item.id === id);
  if (at < 0) throw new Error("Kuyruk görevi bulunamadı.");
  if (!canMutateQueuedTask(next[at].status)) throw new Error("Yalnızca sıradaki görev düzenlenebilir.");
  if (action === "delete") return next.filter((item) => item.id !== id);
  if (action === "save") {
    const text = String(instruction || "").trim().slice(0, 4000);
    if (text.length < 2) throw new Error("Görev metni çok kısa.");
    next[at].instruction = text;
    return next;
  }
  const waiting = next
    .map((item, i) => ({ item, i }))
    .filter(({ item }) => item.status === BUILDER_TASK_QUEUED);
  const pos = waiting.findIndex(({ item }) => item.id === id);
  const swap = action === "up" ? pos - 1 : pos + 1;
  if (pos < 0 || swap < 0 || swap >= waiting.length) return next;
  const a = waiting[pos].item;
  const b = waiting[swap].item;
  const sort = a.sortOrder;
  a.sortOrder = b.sortOrder;
  b.sortOrder = sort;
  return next;
}
