import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppGate } from "@/components/gate";
import { ScreenLoader } from "@/components/screen-loader";
import { StudioVideo } from "@/components/studio-video";
import { Button } from "@/components/ui/button";
import { deleteVideoJob, getVideoJob, type VideoJob } from "@/lib/zunoza/api";
import { nextPollDelay } from "@/lib/zunoza/perf";
import { formatDate, statusLabel } from "@/routes/videolarim";
import { useBootstrap } from "@/components/bootstrap";
import { JobProgress } from "@/components/job-progress";
import { StudioHead } from "@/components/studio-head";
import { getBearerToken } from "@/lib/auth/client";
import { saveMediaFromUrl } from "@/lib/zunoza/save-media";
import {
  AUDIO_HANDOFF_KEY,
  MUSIC_HANDOFF_KEY,
  PROMPT_KEYS,
  STORYBOARD_HANDOFF_KEY,
  VIDEO_CLIP_KEY,
  VIDEO_RETRY_KEY,
  clampStudioDuration,
  jobMediaKey,
  parseJobMediaHandoff,
  peekSessionJson,
  displayVideoModel,
  videoProgressCopy,
  writeSessionJson,
} from "@/lib/zunoza/studio-handoff";

export const Route = createFileRoute("/videolarim_/$jobId")({ component: Page });

function Page() {
  return (
    <AppGate>
      <Detail />
    </AppGate>
  );
}

function writeRetry(job: VideoJob) {
  const sourceKind =
    job.sourceKind === "gorsel" || job.sourceKind === "referans" ? job.sourceKind : "metin";
  const quality =
    job.quality === "standart" || job.quality === "hd" || job.quality === "ultra" ? job.quality : "ekonomik";
  try {
    sessionStorage.setItem(
      VIDEO_RETRY_KEY,
      JSON.stringify({
        prompt: job.prompt,
        durationSeconds: clampStudioDuration(job.durationSeconds),
        aspect: job.aspect,
        quality,
        voiceMode: job.voiceMode,
        language: job.language,
        sourceKind,
        negativePrompt: job.negativePrompt,
      }),
    );
  } catch {
    /* storage unavailable */
  }
}

function Detail() {
  const { jobId } = Route.useParams();
  const nav = useNavigate();
  const { refresh } = useBootstrap();
  const [job, setJob] = useState<VideoJob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    let stop = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let attempt = 0;
    let misses = 0;
    async function tick() {
      try {
        const next = await getVideoJob({ data: { id: jobId } });
        if (stop) return;
        setJob(next);
        setError(null);
        misses = 0;
        if (next.status !== "tamamlandi" && next.status !== "basarisiz") {
          timer = setTimeout(tick, nextPollDelay(attempt, 3000, 8000));
          attempt += 1;
        } else {
          refresh();
        }
      } catch (err) {
        if (stop) return;
        misses += 1;
        if (misses < 8) {
          timer = setTimeout(tick, nextPollDelay(attempt, 3000, 8000));
          attempt += 1;
          return;
        }
        setError(err instanceof Error ? err.message : "Video yüklenemedi.");
      }
    }
    void tick();
    return () => {
      stop = true;
      if (timer) clearTimeout(timer);
    };
  }, [jobId, refresh]);

  useEffect(() => {
    if (!job || job.status === "tamamlandi" || job.status === "basarisiz") return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [job]);

  async function onDelete() {
    await deleteVideoJob({ data: { id: jobId } });
    nav({ to: "/videolarim" });
  }

  function attachedMedia() {
    return parseJobMediaHandoff(peekSessionJson(jobMediaKey(jobId)));
  }

  function handoffClipPrompt() {
    writeSessionJson(PROMPT_KEYS.clip, { prompt: job?.prompt ?? "" });
  }

  function handoffMontage() {
    if (!job) return;
    const extra = attachedMedia();
    if (job.storyboardId) {
      writeSessionJson(STORYBOARD_HANDOFF_KEY, {
        storyboardId: job.storyboardId,
        title: job.prompt.slice(0, 40),
        audioId: extra?.audio?.id ?? null,
        musicId: extra?.music?.id ?? 
... 