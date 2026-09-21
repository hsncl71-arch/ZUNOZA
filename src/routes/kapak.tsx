import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AppGate } from "@/components/gate";
import { Button } from "@/components/ui/button";
import { Choice, ChoiceRow } from "@/components/ui/choice";
import { JobProgress } from "@/components/job-progress";
import { StudioHead } from "@/components/studio-head";
import { useBootstrap } from "@/components/bootstrap";
import { generateStudioImage, type ImageAsset } from "@/lib/zunoza/images";
import { getBearerToken } from "@/lib/auth/client";
import { saveMediaFromUrl } from "@/lib/zunoza/save-media";
import { PROMPT_KEYS, providerWaitCopy, takePromptText } from "@/lib/zunoza/studio-handoff";

export const Route = createFileRoute("/kapak")({ component: Page });

function Page() {
  return (
    <AppGate>
      <CoverStudio />
    </AppGate>
  );
}

function CoverStudio() {
  const nav = useNavigate();
  const { data } = useBootstrap();
  const [idea, setIdea] = useState("");
  const [current, setCurrent] = useState<ImageAsset | null>(null);
  const [busy, setBusy] = useState(false);
  const [busyStarted, setBusyStarted] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [error, setError] = useState<string | null>(null);
  const sendingRef = useRef(false);

  useEffect(() => {
    const text = takePromptText(PROMPT_KEYS.gorsel);
    if (text) setIdea(text);
  }, []);

  useEffect(() => {
    if (!busy) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [busy]);

  async function onGenerate() {
    if (sendingRef.current) return;
    sendingRef.current = true;
    setBusy(true);
    setBusyStarted(Date.now());
    setError(null);
    try {
      const prompt = `Cinematic video thumbnail cover, no text, no letters, no logos, no watermark. ${idea.trim()}`;
      const asset = await generateStudioImage({ data: { prompt, aspect: "16:9", style: "Sinematik" } });
      setCurrent(asset);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kapak üretilemedi.");
    } finally {
      sendingRef.current = false;
      setBusy(false);
    }
  }

  async function downloadAsset(asset: ImageAsset) {
    await saveMediaFromUrl({
      url: `/api/gorseller/${asset.id}/indir`,
      filename: `zunoza-kapak-${asset.id}.jpg`,
      title: "ZUNOZA kapak",
      token: getBearerToken(),
    });
  }

  return (
    <div className="space-y-5">
      <StudioHead kicker="Kapak" title="Yapay Zekâ ile Kapak Oluştur">
        Kapak stili, kapak açıklaması ve boyut (16:9). Metin basılmaz.
      </StudioHead>
      {!data?.aiReady ? (
        <p className="znz-panel p-4 text-sm text-muted">
          Görsel modeli bu ortamda bağlı değil.
        </p>
      ) : null}
      <section className="znz-panel space-y-4 p-4">
        <div>
          <p className="mb-2 text-sm text-muted">Kapak stili</p>
          <ChoiceRow>
            <Choice selected onClick={() => undefined}>
              Sinematik
            </Choice>
          </ChoiceRow>
        </div>
        <div>
          <p className="mb-2 text-sm text-muted">Boyut</p>
          <ChoiceRow>
            <Choice selected onClick={() => undefined}>
              16:9 yatay
            </Choice>
          </ChoiceRow>
        </div>
        <label className="grid gap-2 text-sm">
          <span className="text-muted">Kapak açıklaması</span>
          <textarea
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            rows={4}
            className="znz-field"
            placeholder="Karanlık ormanda yürüyen bir figür, sis, gece ışığı"
          />
        </label>
      </section>
      <Button className="w-full" disabled={busy || idea.trim().length < 8 || !data?.aiReady} onClick={() => void onGenerate()}>
        {busy ? "Kapak üretiliyor…" : data?.unlimited ? "Kapak Üret" : "Kapak Üret"}
      </Button>
      {busy ? (
        <JobProgress
          stages={providerWaitCopy("cover", busyStarted, now).stages}
          current={providerWaitCopy("cover", busyStarted, now).current}
          hint={providerWaitCopy("cover", busyStarted, now).hint}
          elapsed={providerWaitCopy("cover", busyStarted, now).elapsedLabel}
        />
      ) : null}
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {current?.imageUrl ? (
        <section className="space-y-3">
          <img src={current.imageUrl} alt={current.prompt} className="w-full rounded-2xl" />
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void downloadAsset(current)}>İndir</Button>
            <Button
              variant="secondary"
              onClick={() => {
                sessionStorage.setItem(
                  "zunoza.studioImage",
                  JSON.stringify({ id: current.id, prompt: idea, imageUrl: current.imageUrl, aspect: "16:9" }),
                );
                nav({ to: "/olustur" });
              }}
            >
              Videoya ekle
            </Button>
          </div>
        </section>

... 