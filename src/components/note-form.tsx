import { useState } from "react";
import { Button } from "@/components/ui/button";
import { StudioHead } from "@/components/studio-head";
import { submitSupportTicket } from "@/lib/zunoza/admin";

export function NoteForm({
  title,
  hint,
  storageKey,
  kind,
}: {
  title: string;
  hint: string;
  storageKey: string;
  kind: "hata" | "istek";
}) {
  const [text, setText] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const note = text.trim();
    if (!note) return;
    setBusy(true);
    setError(null);
    try {
      await submitSupportTicket({ data: { kind, body: note } });
      try {
        const prev = JSON.parse(localStorage.getItem(storageKey) || "[]") as unknown[];
        localStorage.setItem(storageKey, JSON.stringify([{ at: Date.now(), note }, ...prev].slice(0, 20)));
      } catch {
        /* ignore */
      }
      setText("");
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gönderilemedi.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-5">
      <StudioHead kicker="Destek" title={title}>
        {hint}
      </StudioHead>
      <form onSubmit={onSubmit} className="znz-panel space-y-3 p-4">
        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setSaved(false);
          }}
          rows={6}
          className="znz-field text-sm"
          placeholder="Kısaca yazın…"
        />
        <Button type="submit" className="w-full" disabled={!text.trim() || busy}>
          {busy ? "Gönderiliyor…" : "Gönder"}
        </Button>
        {saved ? <p className="text-sm text-ok">Yönetici paneline iletildi.</p> : null}
        {error ? <p className="text-sm text-danger">{error}</p> : null}
      </form>
    </div>
  );
}
