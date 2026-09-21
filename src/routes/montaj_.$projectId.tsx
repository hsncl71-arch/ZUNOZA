import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { AppGate } from "@/components/gate";
import { StudioHead } from "@/components/studio-head";
import { ScreenLoader } from "@/components/screen-loader";
import { JobProgress } from "@/components/job-progress";
import { StudioVideo, VideoThumb } from "@/components/studio-video";
import { Button } from "@/components/ui/button";
import { Choice, ChoiceRow } from "@/components/ui/choice";
import { getBearerToken } from "@/lib/auth/client";
import { getCreditCatalog } from "@/lib/zunoza/credits";
import {
  deleteMontageProject,
  getMontageProject,
  listMontageLibrary,
  saveMontageProject,
  startMontageRender,
  type LibraryItem,
  type MontageClip,
  type MontageProject,
} from "@/lib/zunoza/montage";
import {
  MONTAGE_MAX_CLIPS,
  MONTAGE_MAX_CLIP_SECONDS,
  clampMontageDuration,
  clampTrimStart,
  clipPlayLength,
  montageProgressCopy,
  montageQuoteLabel,
  quoteMontageCredits,
  reorderClips,
  splitMontageClip,
  timelineSeconds,
} from "@/lib/zunoza/montage-plan";
import { nextPollDelay } from "@/lib/zunoza/perf";
import { saveMediaFromUrl } from "@/lib/zunoza/save-media";
import {
  acceptForUpload,
  classifyUpload,
  postMontageUpload,
  prepareUploadFile,
  readMediaDuration,
  uploadSizeError,
} from "@/lib/zunoza/montage-upload";

export const Route = createFileRoute("/montaj_/$projectId")({ component: Page });

function statusLabel(status: string) {
  if (status === "hazirlaniyor") return "Hazırlanıyor";
  if (status === "render_ediliyor") return "Render ediliyor";
  if (status === "tamamlandi") return "Tamamlandı";
  return "Başarısız";
}

function Page() {
  return (
    <AppGate>
      <Editor />
    </AppGate>
  );
}

function SequencePreview({
  clips,
  lookup,
  aspect,
  overlay,
  voiceUrl,
  musicUrl,
  voiceVol,
  musicVol,
}: {
  clips: MontageClip[];
  lookup: Map<string, LibraryItem>;
  aspect: string;
  overlay: string;
  voiceUrl: string | null;
  musicUrl: string | null;
  voiceVol: number;
  musicVol: number;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const voiceRef = useRef<HTMLAudioElement>(null);
  const musicRef = useRef<HTMLAudioElement>(null);
  const timerRef = useRef<number | null>(null);
  const genRef = useRef(0);
  const idxRef = useRef(0);
  const startedRef = useRef(-1);
  const blobCache = useRef(new Map<string, string>());
  const blobOrder = useRef<string[]>([]);
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const clip = clips[idx];
  const item = clip ? lookup.get(clip.assetId) : undefined;
  const box =
    aspect === "16:9" ? "aspect-video" : aspect === "1:1" ? "aspect-square max-w-72 mx-auto" : "aspect-[9/16] max-h-80 mx-auto";

  function clearTimer() {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  function rememberBlob(src: string, blobUrl: string) {
    blobCache.current.set(src, blobUrl);
    blobOrder.current = blobOrder.current.filter((key) => key !== src).concat(src);
    while (blobOrder.current.length > 2) {
      const old = blobOrder.current.shift();
      if (!old) break;
      const prev = blobCache.current.get(old);
      if (prev) URL.revokeObjectURL(prev);
      blobCache.current.delete(old);
    }
  }

  function stopAll() {
    genRef.current += 1;
    clearTimer();
    setPlaying(false);
    videoRef.current?.pause();
    voiceRef.current?.pause();
    musicRef.current?.pause();
  }

  useEffect(
    () => () => {
      stopAll();
      for (const url of blobCache.current.values()) URL.revokeObjectURL(url);
      blobCache.current.clear();
    },
    [],
  );

  useEffect(() => {
    stopAll();
    setIdx(0);
    idxRef.current = 0;
  }, [clips.map((c) => c.id).join("|")]);

  async function applyVideoSrc(el: HTMLVideoElement, src: string) {
    const cached = blobCache.current.get(src);
    if (cached) {
      if (el.src !== cached) el.src = cached;
      return;
    }
    if (el.getAttribute("data-src") === src && el.src) return;
    el.setAttribute("data-src", src);
    el.src = src;
  }

  async function blobFallback(src: string) {
    if (blobCache.current.has(src)) return blobCache.current.get(src)!;
    const token = getBearerToken();
    const res = await fetch(src, {
      credentials: "include",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) thro
... 