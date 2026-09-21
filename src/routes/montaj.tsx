import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AppGate } from "@/components/gate";
import { StudioHead } from "@/components/studio-head";
import { ScreenLoader } from "@/components/screen-loader";
import { Button } from "@/components/ui/button";
import {
  deleteMontageProject,
  getMontageStatus,
  listMontageProjects,
  listStoryboardGroups,
  saveMontageProject,
  importStoryboardToMontage,
  type MontageProject,
  type StoryboardGroup,
} from "@/lib/zunoza/montage";
import { timelineSeconds } from "@/lib/zunoza/montage-plan";
import {
  AUDIO_HANDOFF_KEY,
  MUSIC_HANDOFF_KEY,
  STORYBOARD_HANDOFF_KEY,
  VIDEO_CLIP_KEY,
  parseAudioHandoff,
  parseMusicHandoff,
  parseStoryboardHandoff,
  parseVideoClipHandoff,
  takeSessionJson,
  type StoryboardHandoff,
} from "@/lib/zunoza/studio-handoff";

export const Route = createFileRoute("/montaj")({ component: Page });

function consumeStudioStoryboard(): StoryboardHandoff | null {
  return parseStoryboardHandoff(takeSessionJson(STORYBOARD_HANDOFF_KEY));
}

function statusLabel(status: MontageProject["status"]) {
  if (status === "hazirlaniyor") return "Hazırlanıyor";
  if (status === "render_ediliyor") return "Render ediliyor";
  if (status === "tamamlandi") return "Tamamlandı";
  return "Başarısız";
}

function Page() {
  return (
    <AppGate>
      <MontageHome />
    </AppGate>
  );
}

function MontageHome() {
  const nav = useNavigate();
  const sendingRef = useRef(false);
  const [projects, setProjects] = useState<MontageProject[]>([]);
  const [boards, setBoards] = useState<StoryboardGroup[]>([]);
  const [ready, setReady] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  async function refresh() {
    const [rows, groups, status] = await Promise.all([
      listMontageProjects(),
      listStoryboardGroups(),
      getMontageStatus(),
    ]);
    setProjects(rows);
    setBoards(groups);
    setReady(Boolean(status.ready));
    setLoaded(true);
  }

  useEffect(() => {
    void refresh().catch((err) => {
      setError(err instanceof Error ? err.message : "Projeler yüklenemedi.");
      setLoaded(true);
    });
    const parsed = consumeStudioStoryboard();
    let musicId: string | null = null;
    try {
      const musicRaw = sessionStorage.getItem("zunoza.studioMusic");
      if (musicRaw) {
        sessionStorage.removeItem("zunoza.studioMusic");
        const parsedMusic = JSON.parse(musicRaw) as { id?: string };
        if (parsedMusic.id) musicId = parsedMusic.id;
      }
    } catch {
      /* ignore */
    }
    let videoClip = null;
    try {
      const clipRaw = sessionStorage.getItem(VIDEO_CLIP_KEY);
      if (clipRaw) {
        sessionStorage.removeItem(VIDEO_CLIP_KEY);
        videoClip = parseVideoClipHandoff(JSON.parse(clipRaw));
      }
    } catch {
      /* ignore */
    }
    if (!parsed && !musicId && !videoClip) return;
    void (async () => {
      if (sendingRef.current) return;
      sendingRef.current = true;
      setBusy(true);
      try {
        if (parsed?.storyboardId) {
          const project = await importStoryboardToMontage({ data: { storyboardId: parsed.storyboardId } });
          if (musicId) {
            await saveMontageProject({
              data: {
                id: project.id,
                title: project.title,
                aspect: project.aspect,
                clips: project.clips,
                voiceAssetId: project.voiceAssetId,
                musicAsset
... 