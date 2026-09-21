import { BUILDER_TASK_ACTIVE, BUILDER_TASK_QUEUED, builderTaskLabel } from "./builder-queue.ts";

export type BuilderStreamItem = {
  id: string;
  kind: "user" | "agent" | "queue" | "preview";
  text: string;
};

const CANNED_STAGE = [
  "ajan çalışıyor",
  "istek analiz ediliyor",
  "uygulama planlanıyor",
  "proje planlanıyor",
  "uygulama mimarisi hazırlanıyor",
  "kod oluşturuluyor",
  "arayüz oluşturuluyor",
  "dosyalar oluşturuluyor",
  "bileşenler bağlanıyor",
  "bileşenler hazırlanıyor",
  "arayüz hazırlanıyor",
  "güvenlik kontrol ediliyor",
  "kontroller yapılıyor",
  "testler çalıştırılıyor",
  "bulunan hata düzeltiliyor",
  "hatalar tespit edildi, düzeltiliyor",
  "build çalıştırılıyor",
  "bağımlılıklar kontrol ediliyor",
  "önizleme hazırlanıyor",
  "tamamlandı",
];

export function isCannedBuilderStage(text: string) {
  const n = String(text || "")
    .toLocaleLowerCase("tr-TR")
    .replace(/[.…]+\s*$/g, "")
    .trim();
  if (!n) return true;
  if (n.startsWith("son güncelleme")) return true;
  return CANNED_STAGE.includes(n);
}

export function builderQueueHasOpenWork(queue?: { status?: string }[] | null) {
  return (queue || []).some((item) => {
    const status = String(item.status || BUILDER_TASK_QUEUED);
    return status === BUILDER_TASK_QUEUED || status === BUILDER_TASK_ACTIVE;
  });
}

export function builderPreviewUnlocked(input: {
  running?: boolean;
  pending?: string | null;
  html?: string | null;
  version?: number;
  queue?: { status?: string }[] | null;
}) {
  if (!String(input.html || "").trim()) return false;
  if (Number(input.version || 0) <= 0) return false;
  if (input.running) return false;
  if (input.pending) return false;
  if (builderQueueHasOpenWork(input.queue)) return false;
  return true;
}

export function mergeBuilderStream(
  prev: BuilderStreamItem[],
  input: {
    projectId: string;
    messages: { id: string; role: string; content: string }[];
    activity: string[];
    stepLabel?: string | null;
    running?: boolean;
    queue?: { id: string; instruction: string; status?: string }[];
    pending?: string | null;
    html?: string | null;
    version?: number;
  },
): BuilderStreamItem[] {
  const out: BuilderStreamItem[] = [];
  const seen = new Set<string>();
  const push = (item: BuilderStreamItem) => {
    if (seen.has(item.id)) return;
    if (item.kind === "agent" && isCannedBuilderStage(item.text)) return;
    seen.add(item.id);
    out.push(item);
  };

  for (const item of prev) {
    if (item.kind === "queue" || item.kind === "preview" || item.id === "live" || item.id === "think") continue;
    push(item);
  }

  if (input.pending) {
    push({ id: `pending:${input.pending.slice(0, 80)}`, kind: "user", text: input.pending });
  }
  for (const msg of input.messages) {
    push({
      id: msg.id,
      kind: msg.role === "user" ? "user" : "agent",
      text: String(msg.content || "").slice(0, 4000),
    });
  }
  for (const line of input.activity) {
    const text = String(line || "").trim();
    if (!text || isCannedBuilderStage(text)) continue;
    push({ id: `log:${text}`, kind: "agent", text });
  }
  const hasRealWork = out.some((item) => item.kind === "agent" && item.id.startsWith("log:"));
  if (input.running && !hasRealWork) {
    out.push({ id: "think", kind: "agent", text: "Düşünülüyor…" });
  }
  for (const item of input.queue || []) {
    push({
      id: `queue:${item.id}`,
      kind: "queue",
      text: `${builderTaskLabel(item.status)} · ${item.instruction.slice(0, 140)}`,
    });
  }
  if (
    builderPreviewUnlocked({
      running: input.running,
      pending: input.pending,
      html: input.html,
      version: input.version,
      queue: input.queue,
    })
  ) {
    const id = `preview:${input.version}`;
    if (!seen.has(id)) out.push({ id, kind: "preview", text: "Önizleme" });
  }
  return out;
}
