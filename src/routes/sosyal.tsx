import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppGate } from "@/components/gate";
import { StudioHead } from "@/components/studio-head";
import { Button } from "@/components/ui/button";
import { Choice, ChoiceRow } from "@/components/ui/choice";
import { useBootstrap } from "@/components/bootstrap";
import { writeStudioCopy } from "@/lib/zunoza/assistant";
import { PROMPT_KEYS, takePromptText } from "@/lib/zunoza/studio-handoff";

export const Route = createFileRoute("/sosyal")({ component: Page });

const PLATFORMS = ["YouTube", "Shorts", "TikTok", "Reels"] as const;

function Page() {
  return (
    <AppGate>
      <SocialStudio />
    </AppGate>
  );
}

function SocialStudio() {
  const { data } = useBootstrap();
  const [idea, setIdea] = useState("");
  const [platform, setPlatform] = useState<(typeof PLATFORMS)[number]>("YouTube");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const textIn = takePromptText(PROMPT_KEYS.social);
    if (textIn) setIdea(textIn);
  }, []);

  async function onWrite() {
    setBusy(true);
    setError(null);
    setCopied(false);
    try {
      const res = await writeStudioCopy({ data: { kind: "social", idea, platform } });
      setText(res.text);
    } catch (err) {
      setError(err instanceof Error ? err.message : "İçerik yazılamadı.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <StudioHead kicker="Sosyal Medya" title="Başlık ve hashtag">
        YouTube, Shorts, TikTok ve Reels için metin hazırlar.
      </StudioHead>
      {!data?.aiReady ? (
        <p className="znz-panel p-4 text-sm text-muted">Asistan modeli bağlı değil.</p>
      ) : null}
      <ChoiceRow>
        {PLATFORMS.map((p) => (
          <Choice key={p} selected={platform === p} onClick={() => setPlatform(p)}>
            {p}
          </Choice>
        ))}
      </ChoiceRow>
      <textarea
        value={idea}
        onChange={(e) => setIdea(e.target.value)}
        rows={4}
        className="znz-field"
        placeholder="Videonuzun konusunu yazın"
      />
      <Button className="w-full" disabled={busy || idea.trim().length < 8 || !data?.aiReady} onClick={() => void onWrite()}>
        {busy ? "Hazırlanıyor…" : "İçerik üret"}
      </Button>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {text ? (
        <section className="znz-panel space-y-3 p-4">
          <pre className="whitespace-pre-wrap font-sans text-sm">{text}</pre>
          <Button
            variant="secondary"
            onClick={async () => {
              await navigator.clipboard.writeText(text).catch(() => undefined);
              setCopied(true);
            }}
          >
            {copied ? "Kopyalandı" : "Kopyala"}
          </Button>
        </section>
      ) : null}
    </div>
  );
}
