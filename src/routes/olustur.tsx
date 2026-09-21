import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp, Plus } from "lucide-react";
import { AppGate } from "@/components/gate";
import { JobProgress } from "@/components/job-progress";
import { StudioHead } from "@/components/studio-head";
import { useBootstrap } from "@/components/bootstrap";
import { getBearerToken } from "@/lib/auth/client";
import { createVideoJob, quoteVideo, type Aspect, type Quality } from "@/lib/zunoza/api";
import { normalizeVoiceMode, type ProductVoiceMode } from "@/lib/zunoza/video-request";
import { normalizeVideoLanguage, VIDEO_SPEECH_LANGUAGES } from "@/lib/zunoza/video-languages";
import {
  AUDIO_HANDOFF_KEY,
  MUSIC_HANDOFF_KEY,
  PROMPT_KEYS,
  VIDEO_RETRY_KEY,
  jobMediaKey,
  parseAudioHandoff,
  parseMusicHandoff,
  parseVideoRetry,
  providerWaitCopy,
  takeSessionJson,
  videoQuoteLabel,
  writeSessionJson,
  type VideoRetryPayload,
} from "@/lib/zunoza/studio-handoff";

export const Route = createFileRoute("/olustur")({ component: Page });

const DURATIONS = [5, 10, 15] as const;
const ASPECTS: { id: Aspect; label: string }[] = [
  { id: "9:16", label: "9:16 — TikTok / Shorts / Reels" },
  { id: "16:9", label: "16:9 — YouTube" },
  { id: "1:1", label: "1:1 — Kare" },
  { id: "4:3", label: "4:3" },
  { id: "3:4", label: "3:4" },
  { id: "3:2", label: "3:2" },
  { id: "2:3", label: "2:3" },
];
const QUALITIES: { id: Quality; label: string }[] = [
  { id: "ekonomik", label: "Ekonomik — 480p" },
  { id: "standart", label: "Standart — 720p" },
  { id: "hd", label: "HD — 720p" },
  { id: "ultra", label: "Ultra — 1080p (metin/görsel)" },
];
const VOICES: { id: ProductVoiceMode; label: string; hint: string }[] = [
  { id: "sessiz", label: "Sessiz", hint: "Konuşma, müzik veya ortam sesi yok." },
  {
    id: "ortam",
    label: "Doğal Ortam Sesleri",
    hint: "Rüzgâr, yağmur, trafik, kapı, ayak sesi… insan konuşması yok.",
  },
  { id: "konusma", label: "Konuşmalı / Anlatımlı", hint: "Sahneye uygun konuşma veya anlatıcı." },
  { id: "ozel", label: "Özel Ses Talimatı", hint: "Ses davranışını kendiniz yazın." },
];

const CAMERA_CHIPS = [
  { id: "slow", label: "Yavaş kamera", phrase: "yavaş kamera" },
  { id: "dolly-in", label: "Yaklaş", phrase: "yavaş yaklaşan kamera" },
  { id: "orbit", label: "Etrafında dön", phrase: "etrafında dönen kamera" },
  { id: "tracking", label: "Takip", phrase: "takip çekimi" },
  { id: "handheld", label: "Elde", phrase: "elde kamera" },
  { id: "static", label: "Sabit", phrase: "sabit kamera" },
] as const;

const LIGHT_CHIPS = [
  { id: "golden", label: "Gün batımı", phrase: "gün batımı ışığı" },
  { id: "neon", label: "Neon", phrase: "neon ışık" },
  { id: "moon", label: "Ay ışığı", phrase: "ay ışığı" },
  { id: "volumetric", label: "Işık huzmesi", phrase: "hacimsel ışık huzmesi" },
  { id: "practical", label: "Sahne lambası", phrase: "lamba ışığı" },
] as const;

const VFX_CHIPS = [
  { id: "rain", label: "Yağmur", phrase: "yağmur" },
  { id: "fog", label: "Sis", phrase: "sis" },
  { id: "particles", label: "Toz / parçacık", phrase: "uçuşan toz parçacıkları" },
  { id: "slowmo", label: "Ağır çekim", phrase: "ağır çekim" },
  { id: "flare", label: "Lens flare", phrase: "lens flare" },
] as const;

function Page() {
  return (
    <AppGate>
      <CreateForm />
    </AppGate>
  );
}

async function readImageFile(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Lütfen bir görsel dosyası seçin.");
  if (file.size > 4_000_000) throw new Error("Görsel 4 MB’dan küçük olmalı.");
  const bitmap = await createImageBitmap(file);
  const max = 1024;
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.heigh
... 