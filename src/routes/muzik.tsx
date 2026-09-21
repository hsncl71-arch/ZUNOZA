import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AppGate } from "@/components/gate";
import { Button } from "@/components/ui/button";
import { ScreenLoader } from "@/components/screen-loader";
import { StudioAudio } from "@/components/studio-audio";
import {
  generateStudioMusic,
  generateVoiceSong,
  getMusicStatus,
  listStudioMusic,
  deleteStudioMusic,
  updateStudioMusic,
  uploadStudioMusic,
  writeSongLyrics,
  type MusicAsset,
} from "@/lib/zunoza/music";
import { getBearerToken } from "@/lib/auth/client";
import { getCreditCatalog } from "@/lib/zunoza/credits";
import { musicCredits, voiceSongCredits } from "@/lib/zunoza/credit-economy";
import {
  CUSTOM_STYLE_ID,
  MUSIC_STYLE_GROUPS,
  MUSIC_STYLE_NOTE_MAX,
  MUSIC_STYLES,
  musicStyleById,
} from "@/lib/zunoza/music-style";
import {
  MUSIC_HANDOFF_KEY,
  PROMPT_KEYS,
  musicQuoteLabel,
  providerWaitCopy,
  takePromptText,
  writeSessionJson,
} from "@/lib/zunoza/studio-handoff";

export const Route = createFileRoute("/muzik")({ component: Page });

const MOODS = ["Epik", "Hüzünlü", "Enerjik", "Sakin", "Karanlık", "Umutlu", "Yanık", "Ağır"];
const DURATIONS = [15, 30, 45] as const;

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

function readFileAsBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Dosya okunamadı."));
    reader.readAsDataURL(file);
  });
}

function audioDuration(file: File) {
  return new Promise<number>((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = document.createElement("audio");
    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      const d = Number.isFinite(audio.duration) ? audio.duration : 15;
      URL.revokeObjectURL(url);
      resolve(Math.max(1, Math.min(180, d)));
    };
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(15);
    };
    audio.src = url;
  });
}

function Page() {
  return (
    <AppGate>
      <MusicStudio />
    </AppGate>
  );
}

function MusicPlayer({
  asset,
  onChange,
}: {
  asset: MusicAsset;
  onChange: (next: MusicAsset) => void;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [trimStart, setTrimStart] = useState(asset.trimStart);
  const [trimEnd, setTrimEnd] = useState(asset.trimEnd);
  const [volume, setVolume] = useState(Math.round(asset.volume * 100));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setTrimStart(asset.trimStart);
    setTrimEnd(asset.trimEnd);
    setVolume(Math.round(asset.volume * 100));
  }, [asset.id, asset.trimStart, asset.trimEnd, asset.volume]);

  useEffect(() => {
    const el = audioRef.current;
    if (el) el.volume = volume / 100;
  }, [volume]);

  function onTime() {
    const el = audioRef.current;
    if (!el) return;
    if (el.currentTime >= trimEnd) {
      el.pause();
      el.currentTime = trimStart;
    }
  }

  async function playTrimmed() {
    const el = audioRef.current;
    if (!el) return;
    el.currentTime = trimStart;
    el.volume = volume / 100;
    await el.play().catch(() => undefined);
  }

  async function saveEdit() {
    setBusy(true);
    setError(null);
    try {
      const saved = await updateStudioMusic({
        data: { id: asset.id, trimStart, trimEnd, volume: volume / 100 },
      });
      onChange(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kırpma kaydedilemedi.");
    } finally {
      setBusy(false);
    }
  }

  const max = Math.max(1, asset.durationSeconds);

  return (
    <div className="space-y-3">
      <StudioAudio
        ref={audioRef}
        src={asset.a
... 