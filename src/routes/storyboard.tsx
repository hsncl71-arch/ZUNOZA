import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppGate } from "@/components/gate";
import { Button } from "@/components/ui/button";
import { Choice, ChoiceRow } from "@/components/ui/choice";
import { ScreenLoader } from "@/components/screen-loader";
import { JobProgress } from "@/components/job-progress";
import { StudioHead } from "@/components/studio-head";
import { StudioVideo } from "@/components/studio-video";
import { StudioAudio } from "@/components/studio-audio";
import { createVideoJob, listStoryboards, type StoryboardBoard, type VideoJob } from "@/lib/zunoza/api";
import { useBootstrap } from "@/components/bootstrap";
import { statusLabel } from "@/routes/videolarim";
import { getCreditCatalog } from "@/lib/zunoza/credits";
import { nextPollDelay } from "@/lib/zunoza/perf";
import {
  AUDIO_HANDOFF_KEY,
  MUSIC_HANDOFF_KEY,
  PROMPT_KEYS,
  STORYBOARD_HANDOFF_KEY,
  parseAudioHandoff,
  parseMusicHandoff,
  providerWaitCopy,
  takePromptText,
  takeSessionJson,
  writeSessionJson,
  type AudioHandoff,
  type MusicHandoff,
} from "@/lib/zunoza/studio-handoff";

export const Route = createFileRoute("/storyboard")({ component: Page });

type Scene = { id: string; prompt: string; seconds: 5 | 10 | 15 };

function newScene(prompt = "", seconds: 5 | 10 | 15 = 15): Scene {
  return { id: crypto.randomUUID(), prompt, seconds };
}

function consumeStudioAudio(): AudioHandoff | null {
  return parseAudioHandoff(takeSessionJson(AUDIO_HANDOFF_KEY));
}

function consumeStudioMusic(): MusicHandoff | null {
  return parseMusicHandoff(takeSessionJson(MUSIC_HANDOFF_KEY));
}

function Page() {
  return (
    <AppGate>
      <Board />
    </AppGate>
  );
}

function Board() {
  const nav = useNavigate();
  const { refresh } = useBootstrap();
  const sendingRef = useRef(false);
  const [scenes, setScenes] = useState<Scene[]>([newScene()]);
  const [busy, setBusy] = useState(false);
  const [busyStarted, setBusyStarted] = useState(0);
  const [now, setNow] = useState(Date.now());
  const pendingMontage = useRef<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [lastBoardId, setLastBoardId] = useState<string | null>(null);
  const [boards, setBoards] = useState<StoryboardBoard[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [attachedAudio, setAttachedAudio] = useState<AudioHandoff | null>(null);
  const [attachedMusic, setAttachedMusic] = useState<MusicHandoff | null>(null);
  const [quoteReady, setQuoteReady] = useState(false);
  const [quoteError, setQuoteError] = useState(false);
  const [unlimited, setUnlimited] = useState(false);
  const [videoTable, setVideoTable] = useState<Record<string, Record<string, number>>>({});
  const [balance, setBalance] = useState(0);
  const total = scenes.reduce((s, x) => s + x.seconds, 0);
  const sceneCredits = scenes.reduce((sum, scene) => {
    const unit = videoTable[String(scene.seconds)]?.ekonomik ?? 0;
    return sum + unit;
  }, 0);

  async function loadBoards() {
    const next = await listStoryboards();
    setBoards(next);
    try {
      const focus = sessionStorage.getItem("zunoza.lastStoryboard");
      if (focus) {
        sessionStorage.removeItem("zunoza.lastStoryboard");
        setLastBoardId(focus);
      }
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    getCreditCatalog()
      .then((c) => {
        setUnlimited(Boolean(c.unlimited));
        setVideoTable(c.video ?? {});
        setBalance(Number(c.balance) || 0);
        setQuoteReady(true);
      })
      .catch(() => {
        setQuoteError(true);
        setQuoteReady(false);
      });
  }, []);

  useEffect(() => {
    let stop = false;
    let timer: number | undefined;
    async function tick() {
      try {
        const next = await listStoryboards();
        if (stop) return;
        setBoards(next);
        setLoaded(true);
        try {
          const focus = sessionStorage.getItem("zunoza.lastStoryboard");
          if (focus) {
            sessionStorage.removeItem("zunoza.lastStoryboard");
            setLastBoardId(focus);
          }
        } catch {
          /* ignore */
        }
        const running 
... 