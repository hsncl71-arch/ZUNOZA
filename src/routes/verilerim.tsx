import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppGate } from "@/components/gate";
import { Button } from "@/components/ui/button";
import { Choice, ChoiceRow } from "@/components/ui/choice";
import { StudioHead } from "@/components/studio-head";
import { useBootstrap } from "@/components/bootstrap";
import { signOut } from "@/lib/auth/client";
import {
  clearAllMemories,
  deleteMemory,
  listMemories,
  saveMemory,
  type MemoryRow,
} from "@/lib/zunoza/memory";
import {
  eraseMyAccount,
  getDataInventory,
  listMyConsents,
  listMyPrivacyRequests,
  STORAGE_NOTICE,
  submitPrivacyRequest,
} from "@/lib/zunoza/privacy";

export const Route = createFileRoute("/verilerim")({ component: Page });

const REQUEST_KINDS = [
  { id: "erisim" as const, label: "Erişim" },
  { id: "duzeltme" as const, label: "Düzeltme" },
  { id: "silme" as const, label: "Silme" },
  { id: "itiraz" as const, label: "İtiraz" },
];

function Page() {
  return (
    <AppGate>
      <DataCenter />
    </AppGate>
  );
}

function DataCenter() {
  const { data } = useBootstrap();
  const [inv, setInv] = useState<Awaited<ReturnType<typeof getDataInventory>> | null>(null);
  const [notes, setNotes] = useState<MemoryRow[]>([]);
  const [consents, setConsents] = useState<Awaited<ReturnType<typeof listMyConsents>>>([]);
  const [requests, setRequests] = useState<Awaited<ReturnType<typeof listMyPrivacyRequests>>>([]);
  const [draft, setDraft] = useState("");
  const [kind, setKind] = useState<(typeof REQUEST_KINDS)[number]["id"]>("erisim");
  const [body, setBody] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  function reload() {
    getDataInventory().then(setInv).catch(() => setInv(null));
    listMemories().then(setNotes).catch(() => setNotes([]));
    listMyConsents().then(setConsents).catch(() => setConsents([]));
    listMyPrivacyRequests().then(setRequests).catch(() => setRequests([]));
  }

  useEffect(() => {
    reload();
  }, []);

  return (
    <div className="space-y-5 pb-8">
      <StudioHead kicker="Hesap" title="Verilerim">
        Kayıtlarınızı görün, hafızayı yönetin, KVKK başvurusu veya hesap silme talebi gönderin.
      </StudioHead>

      <section className="znz-panel space-y-2 p-4">
        <h2 className="studio-section">Saklanan özet</h2>
        <p className="text-sm text-muted">
          Video {inv?.videos ?? 0} · Görsel {inv?.images ?? 0} · Müzik {inv?.music ?? 0} · Ses {inv?.tts ?? 0} · Montaj{" "}
          {inv?.montages ?? 0} · Not {inv?.memories ?? 0} · Ödeme kaydı {inv?.payments ?? 0}
        </p>
      </section>

      <section className="znz-panel space-y-3 p-4">
        <h2 className="studio-section">Hafıza</h2>
        <div className="flex gap-2">
          <input
            className="znz-field min-h-11 min-w-0 flex-1"
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
        <ul className="space-y-2">
          {notes.map((n) => (
            <li key={n.id} className="flex items-start justify-between gap-2 rounded-xl bg-elevated px-3 py-2 text-sm">
              <span>{n.content}</span>
              <button
                type="button"
                className="inline-flex min-h-11 items-center text-danger"
                onClick={() => void deleteMemory({ data: { id: n.id } }).then(setNotes)}
              >
                Sil
              </button>
            </li>
          ))}

... 