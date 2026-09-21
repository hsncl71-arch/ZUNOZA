import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppGate } from "@/components/gate";
import { StudioHead } from "@/components/studio-head";
import { Button } from "@/components/ui/button";
import { useBootstrap } from "@/components/bootstrap";
import { writeStudioCopy } from "@/lib/zunoza/assistant";
import { PROMPT_KEYS, takePromptText, writeSessionJson } from "@/lib/zunoza/studio-handoff";

export const Route = createFileRoute("/senaryo")({ component: Page });

function Page() {
  return (
    <AppGate>
      <ScriptStudio />
    </AppGate>
  );
}

function ScriptStudio() {
  const nav = useNavigate();
  const { data } = useBootstrap();
  const [idea, setIdea] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const textIn = takePromptText(PROMPT_KEYS.script);
    if (textIn) setIdea(textIn);
  }, []);

  async function onWrite() {
    setBusy(true);
    setError(null);
    try {
      const res = await writeStudioCopy({ data: { kind: "script", idea } });
      setText(res.text);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Senaryo yazılamadı.");
    } finally {
      setBusy(false);
    }
  }

  function send(to: "/olustur" | "/storyboard") {
    const prompt = (text.trim() || idea).slice(0, 2000);
    writeSessionJson(to === "/storyboard" ? PROMPT_KEYS.clip : PROMPT_KEYS.olustur, { prompt });
    nav({ to });
  }

  return (
    <div className="space-y-5">
      <StudioHead kicker="Senaryo" title="Senaryo Oluştur">
        Fikrinizi sahneye ve ZUNOZA video isteğine çevirir.
      </StudioHead>
      {!data?.aiReady ? (
        <p className="znz-panel p-4 text-sm text-muted">Asistan modeli bağlı değil.</p>
      ) : null}
      <textarea
        value={idea}
        onChange={(e) => setIdea(e.target.value)}
        rows={4}
        className="znz-field"
        placeholder="Yaşlı bir ağaç, bal peteği, arılar, belgesel sahnesi…"
      />
      <Button className="w-full" disabled={busy || idea.trim().length < 8 || !data?.aiReady} onClick={() => void onWrite()}>
        {busy ? "Yazılıyor…" : "Senaryo ve istek üret"}
      </Button>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {text ? (
        <section className="znz-panel space-y-3 p-4">
          <pre className="whitespace-pre-wrap font-sans text-sm">{text}</pre>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => send("/olustur")}>
              Video Stüdyosuna aktar
            </Button>
            <Button variant="secondary" onClick={() => send("/storyboard")}>
              Storyboard’a aktar
            </Button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
