import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AppGate } from "@/components/gate";
import { Button } from "@/components/ui/button";
import { ScreenLoader } from "@/components/screen-loader";
import { StudioAudio } from "@/components/studio-audio";
import { useBootstrap } from "@/components/bootstrap";
import {
  generateStudioAudio,
  listStudioAudio,
  deleteStudioAudio,
  listTtsVoices,
  type TtsVoice,
  type VoiceAsset,
} from "@/lib/zunoza/tts";
import { getBearerToken } from "@/lib/auth/client";
import { getCreditCatalog } from "@/lib/zunoza/credits";
import { ttsCredits } from "@/lib/zunoza/credit-economy";
import {
  AUDIO_HANDOFF_KEY,
  PROMPT_KEYS,
  creditSpendCopy,
  musicQuoteLabel,
  providerWaitCopy,
  takePromptText,
  writeSessionJson,
} from "@/lib/zunoza/studio-handoff";

export const Route = createFileRoute("/seslendirme")({ component: Page });

function Chip({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`min-h-11 rounded-full px-3 text-sm ${selected ? "bg-accent text-accent-fg" : "bg-elevated"}`}
    >
      {children}
    </button>
  );
}

function Page() {
  return (
    <AppGate>
      <VoiceStudio />
    </AppGate>
  );
}

function VoiceStudio() {
  const nav = useNavigate();
  const { data } = useBootstrap();
  const sendingRef = useRef(false);
  const [text, setText] = useState("");
  const [voices, setVoices] = useState<TtsVoice[]>([]);
  const [voiceId, setVoiceId] = useState("eve");
  const [language, setLanguage] = useState("tr");
  const [current, setCurrent] = useState<VoiceAsset | null>(null);
  const [library, setLibrary] = useState<VoiceAsset[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [busyStarted, setBusyStarted] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [loaded, setLoaded] = useState(false);
  const [quoteReady, setQuoteReady] = useState(false);
  const [quoteError, setQuoteError] = useState(false);
  const [unlimited, setUnlimited] = useState(false);
  const [catalog, setCatalog] = useState<Record<string, number>>({});
  const [balance, setBalance] = useState(0);

  const credits = ttsCredits(text.length || 400, catalog);
  const canSubmit = text.trim().length >= 8 && Boolean(data?.aiReady) && Boolean(voiceId) && (unlimited || (quoteReady && !quoteError));

  async function refreshLibrary() {
    try {
      setLibrary(await listStudioAudio());
    } catch {
      /* keep last */
    }
  }

  useEffect(() => {
    void listTtsVoices()
      .then((rows) => {
        setVoices(rows);
        if (rows[0] && !rows.some((v) => v.id === "eve")) setVoiceId(rows[0].id);
      })
      .catch(() => setVoices([]))
      .finally(() => setLoaded(true));
    const incoming = takePromptText(PROMPT_KEYS.voice);
    if (incoming) setText(incoming);
    void refreshLibrary();
  }, []);

  useEffect(() => {
    setQuoteReady(false);
    setQuoteError(false);
    getCreditCatalog()
      .then((c) => {
        setUnlimited(Boolean(c.unlimited));
        setCatalog(c.features ?? {});
        setBalance(Number(c.balance) || 0);
        setQuoteReady(true);
      })
      .catch(() => {
        setQuoteError(true);
        setQuoteReady(false);
      });
  }, []);

  useEffect(() => {
    if (!busy) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [busy]);

  async function onGenerate() {
    if (sendingRef.current) return;
    sendingRef.current = true;
    setError(null);
    setNotice(null);
    setBusy(true);
    setBusyStarted(Date.now());
    try {
      const asset = await generateStudioAudio({
        data: { text, voiceId, language },
      });
      setCurrent(asset);
      setNotice(
        asset.storedOnR2
          ? unlimited
            ? "Ses üretildi ve kalıcı olarak kaydedildi. Sahip hesabında kredi düşülmedi."
            : `Ses üretildi ve kalıcı olarak kayded
... 