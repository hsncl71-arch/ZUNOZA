import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppGate } from "@/components/gate";
import { StudioHead } from "@/components/studio-head";
import { Button } from "@/components/ui/button";
import { useI18n, type Locale } from "@/lib/i18n";
import { deleteMemory, listMemories, saveMemory, updateMemory, clearAllMemories, type MemoryRow } from "@/lib/zunoza/memory";

export const Route = createFileRoute("/ayarlar")({ component: Page });

function Page() {
  return (
    <AppGate>
      <Settings />
    </AppGate>
  );
}

function Settings() {
  const { locale, setLocale, t } = useI18n();
  const items: { id: Locale; label: string }[] = [
    { id: "tr", label: t("lang.tr") },
    { id: "en", label: t("lang.en") },
  ];
  const [notes, setNotes] = useState<MemoryRow[]>([]);
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    listMemories().then(setNotes).catch(() => setNotes([]));
  }, []);
  return (
    <div className="space-y-5">
      <StudioHead kicker="Hesap" title="Ayarlar" />
      <section className="znz-panel space-y-3 p-5">
        <h2 className="studio-section">{t("lang.label")}</h2>
        <div className="flex gap-2">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`min-h-11 rounded-full px-5 text-sm ${
                locale === item.id ? "bg-accent text-accent-fg" : "bg-elevated text-muted"
              }`}
              onClick={() => setLocale(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-subtle">Dil bu cihazda hatırlanır. Üretim ayarları değişmez.</p>
      </section>
      <section className="znz-panel space-y-3 p-5">
        <h2 className="studio-section">Hafıza</h2>
        <p className="text-xs text-subtle">
          “Bunu not al”, “notlarımı listele”, “1. notu sil” diyebilirsin. Hassas bilgi kaydedilmez.
        </p>
        <div className="flex gap-2">
          <input
            className="min-h-11 min-w-0 flex-1 rounded-2xl border border-border bg-surface px-3 text-sm"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Yeni not"
          />
          <Button
            type="button"
            onClick={async () => {
              const result = await saveMemory({ data: { content: draft } });
              setNotes(result.items);
              setDraft("");
              setMsg(result.reply);
            }}
          >
            Kaydet
          </Button>
        </div>
        {notes.length === 0 ? <p className="text-sm text-muted">Kayıtlı not yok.</p> : null}
        {notes.map((row, i) => (
          <div key={row.id} className="rounded-2xl border border-border bg-surface px-3 py-2 text-sm">
            {editing === row.id ? (
              <div className="space-y-2">
                <input
                  className="min-h-11 w-full rounded-xl border border-border bg-elevated px-3"
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    onClick={async () => {
                      const list = await updateMemory({ data: { id: row.id, content: editText } });
                      setNotes(list);
                      setEditing(null);
                    }}
                  >
                    Kaydet
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => setEditing(null)}>
                    Vazgeç
                  </Button>
                </div>
              </div>
            ) : (
              <>
     
... 