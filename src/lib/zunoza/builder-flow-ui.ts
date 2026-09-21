import type { BuilderStreamItem } from "./builder-stream.ts";

export const BUILDER_THINK_STALL_MS = 90_000;

export type FlowBlock =
  | { type: "user"; item: BuilderStreamItem }
  | { type: "work"; id: string; title: string; items: BuilderStreamItem[]; live: boolean }
  | { type: "queue"; item: BuilderStreamItem }
  | { type: "preview"; item: BuilderStreamItem };

export function formatRunClock(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function builderThinkStalled(elapsedMs: number) {
  return elapsedMs >= BUILDER_THINK_STALL_MS;
}

export function builderThinkProgress(elapsedMs: number) {
  if (elapsedMs <= 0) return 0;
  return Math.min(100, Math.round((elapsedMs / BUILDER_THINK_STALL_MS) * 100));
}

export function builderThinkLine(elapsedMs: number) {
  const clock = formatRunClock(elapsedMs);
  if (builderThinkStalled(elapsedMs)) {
    return `Düşünülüyor… ${clock} — bu adım 90 saniyeyi aştı.`;
  }
  return `Düşünülüyor… ${clock}`;
}

export function builderThinkStallCopy() {
  return "Bu adım 90 saniyeyi aştı. İşlem hâlâ sürebilir; bekleyebilir veya tekrar deneyebilirsiniz.";
}

export function builderJobTimeoutCopy() {
  return "İnşa işlemi zaman aşımına uğradı. Tekrar deneyebilirsiniz.";
}

export function workSectionTitle(text: string) {
  const n = String(text || "").toLocaleLowerCase("tr-TR");
  if (/incele|analiz|anlaşıldı|gereksinim/.test(n)) return "Analiz";
  if (/plan|sayfa/.test(n)) return "Planlama";
  if (/dosya/.test(n)) return "Dosyalar güncelleniyor";
  if (/bağla|api|entegr/.test(n)) return "Bağlantılar kuruluyor";
  if (/test|kalite/.test(n)) return "Test ediliyor";
  if (/hata|düzelt|onar/.test(n)) return "Hata düzeltiliyor";
  if (/önizleme/.test(n)) return "Önizleme hazırlanıyor";
  return "İnşa ediliyor";
}

export function workLineKind(text: string): "ok" | "run" | "err" | "retry" | "note" {
  const n = String(text || "").toLocaleLowerCase("tr-TR");
  if (/yeniden den|tekrar den/.test(n)) return "retry";
  if (/başarısız|hata| durdur/.test(n)) return "err";
  if (/düşünülüyor|hazırlanıyor|çalışıyor/.test(n)) return "run";
  if (/incelendi|güncellendi|oluşturuldu|bağlandı|tamamlandı|hazır|planlandı/.test(n)) return "ok";
  return "note";
}

export function groupBuilderFlow(items: BuilderStreamItem[], running: boolean): FlowBlock[] {
  const out: FlowBlock[] = [];
  let work: Extract<FlowBlock, { type: "work" }> | null = null;
  const flush = () => {
    if (work) {
      out.push(work);
      work = null;
    }
  };
  for (const item of items) {
    if (item.kind === "user") {
      flush();
      out.push({ type: "user", item });
      continue;
    }
    if (item.kind === "queue") {
      flush();
      out.push({ type: "queue", item });
      continue;
    }
    if (item.kind === "preview") {
      flush();
      out.push({ type: "preview", item });
      continue;
    }
    if (!work) {
      work = {
        type: "work",
        id: `work:${item.id}`,
        title: workSectionTitle(item.text),
        items: [item],
        live: item.id === "think",
      };
    } else {
      work.items.push(item);
      if (item.id === "think") work.live = true;
    }
  }
  flush();
  if (running) {
    const last = [...out].reverse().find((b) => b.type === "work");
    if (last && last.type === "work") last.live = true;
  }
  return out;
}

export function resultBullets(activity: string[] | undefined, max = 6) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of activity || []) {
    const text = String(line || "").trim();
    if (text.length < 8 || seen.has(text)) continue;
    seen.add(text);
    out.push(text);
    if (out.length >= max) break;
  }
  return out;
}
