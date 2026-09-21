import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AppGate } from "@/components/gate";
import { Button } from "@/components/ui/button";
import { Choice, ChoiceRow } from "@/components/ui/choice";
import { JobProgress } from "@/components/job-progress";
import { StudioHead } from "@/components/studio-head";
import { StudioVideo } from "@/components/studio-video";
import { useBootstrap } from "@/components/bootstrap";
import { createVideoJob, getVideoJob, quoteVideo, type VideoJob } from "@/lib/zunoza/api";
import { getBearerToken } from "@/lib/auth/client";
import { saveMediaFromUrl } from "@/lib/zunoza/save-media";
import { nextPollDelay } from "@/lib/zunoza/perf";
import { providerWaitCopy, videoProgressCopy } from "@/lib/zunoza/studio-handoff";
import {
  MEMORY_DEFAULT_SECONDS,
  MEMORY_MOTIONS,
  MEMORY_NEGATIVE,
  MEMORY_SECONDS,
  aspectFromSize,
  buildMemoryClipPrompt,
  memoryCreateError,
  memoryJobId,
  memoryProviderSeconds,
  type MemoryMotionId,
  type MemorySeconds,
} from "@/lib/zunoza/memory-clip";

export const Route = createFileRoute("/anilar")({ component: Page });

function Page() {
  return (
    <AppGate>
      <MemoryStudio />
    </AppGate>
  );
}

async function readPhoto(file: File) {
  if (!file.type.startsWith("image/") && !/\.(jpe?g|png|webp|heic|heif)$/i.test(file.name)) {
    throw new Error("Lütfen tek bir fotoğraf seçin.");
  }
  if (file.size > 12_000_000) throw new Error("Fotoğraf 12 MB’dan küçük olmalı.");
  const bitmap = await createImageBitmap(file);
  const aspect = aspectFromSize(bitmap.width, bitmap.height);
  const max = 1024;
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Fotoğraf işlenemedi.");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
  if (!dataUrl.startsWith("data:image/jpeg")) throw new Error("Fotoğraf JPEG olarak hazırlanamadı.");
  return { dataUrl, aspect };
}

function MemoryStudio() {
  const { data, refresh } = useBootstrap();
  const fileRef = useRef<HTMLInputElement>(null);
  const sendingRef = useRef(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [aspect, setAspect] = useState(aspectFromSize(3, 4));
  const [motion, setMotion] = useState<MemoryMotionId>("dogal");
  const [seconds, setSeconds] = useState<MemorySeconds>(MEMORY_DEFAULT_SECONDS);
  const [quote, setQuote] = useState({ credits: 0, unlimited: false });
  const [quoteReady, setQuoteReady] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [busyStarted, setBusyStarted] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [error, setError] = useState<string | null>(null);
  const [job, setJob] = useState<VideoJob | null>(null);
  const [downloading, setDownloading] = useState(false);

  const providerSeconds = memoryProviderSeconds(seconds);

  useEffect(() => {
    let cancelled = false;
    setQuoteReady(false);
    setQuoteError(null);
    quoteVideo({ data: { durationSeconds: providerSeconds, quality: "standart", sourceKind: "gorsel" } })
      .then((next: { credits?: number; unlimited?: boolean } | null) => {
        if (cancelled) return;
        setQuote({ credits: Number(next?.credits ?? 0), unlimited: Boolean(next?.unlimited) });
        setQuoteReady(true);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setQuoteError(err instanceof Error ? err.message : "Kredi alınamadı.");
        setQuoteReady(false);
      });
    return () => {
      cancelled = true;
    };
  }, [providerSeconds]);

  useEffect(() => {
    if (!busy && !(job && job.status !== "tamamlandi" && job.status !== "basarisiz")) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [busy, job]);

  useEffect(() => {
    if (!job?.id) return;
    if (job.status === "tamamlandi" || job.status === "basarisiz") return;
    let stop = false;
    let timer: ReturnT
... 