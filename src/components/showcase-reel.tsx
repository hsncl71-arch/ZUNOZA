import { useEffect, useRef, useState, type RefObject } from "react";
import { useNavigate } from "@tanstack/react-router";
import { AdminClipBar } from "@/components/admin-clip-bar";
import { useBootstrap } from "@/components/bootstrap";
import { CardPreview } from "@/components/card-preview";
import { listShowcaseClips } from "@/lib/zunoza/showcase-api";
import {
  SHOWCASE_BADGE_LABEL,
  showcaseToRetry,
  type PublicShowcaseCard,
  type ShowcaseClip,
} from "@/lib/zunoza/showcase";
import { VIDEO_RETRY_KEY, writeSessionJson } from "@/lib/zunoza/studio-handoff";

function asClip(card: PublicShowcaseCard): ShowcaseClip {
  return {
    ...card,
    sortOrder: 0,
    active: true,
    lane: "ilham",
    tag: card.tag || "",
    studioPath: card.studioPath || "/olustur",
    prompt: card.prompt || "",
  };
}

function launchCreate(clip: ShowcaseClip, subject?: string) {
  writeSessionJson(VIDEO_RETRY_KEY, showcaseToRetry(clip, subject));
}

function useSlowRail(railRef: RefObject<HTMLDivElement | null>, active: boolean, loop: boolean) {
  useEffect(() => {
    const rail = railRef.current;
    if (!rail || !active) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const el = rail;

    const PX_PER_SEC = 22;
    const RESUME_MS = 1500;
    let paused = false;
    let pos = el.scrollLeft;
    let last = 0;
    let raf = 0;
    let resumeTimer = 0;

    function tick(now: number) {
      raf = requestAnimationFrame(tick);
      if (!last) last = now;
      const dt = Math.min(48, now - last);
      last = now;
      if (paused || document.hidden) {
        pos = el.scrollLeft;
        return;
      }
      const max = Math.max(0, el.scrollWidth - el.clientWidth);
      if (max < 8) return;
      pos += (PX_PER_SEC * dt) / 1000;
      if (loop) {
        const half = el.scrollWidth / 2;
        if (half >= 24 && pos >= half) pos -= half;
      } else if (pos >= max) {
        pos = 0;
      }
      if (pos < 0) pos = 0;
      if (Math.abs(el.scrollLeft - pos) >= 0.2) el.scrollLeft = pos;
    }

    function hold() {
      paused = true;
      pos = el.scrollLeft;
      window.clearTimeout(resumeTimer);
    }

    function release() {
      pos = el.scrollLeft;
      window.clearTimeout(resumeTimer);
      resumeTimer = window.setTimeout(() => {
        paused = false;
        pos = el.scrollLeft;
        last = 0;
      }, RESUME_MS);
    }

    el.addEventListener("pointerdown", hold, { capture: true });
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", release);
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(resumeTimer);
      el.removeEventListener("pointerdown", hold, { capture: true });
      window.removeEventListener("pointerup", release);
      window.removeEventListener("pointercancel", release);
    };
  }, [railRef, active, loop]);
}

export function ShowcaseReel() {
  const [clips, setClips] = useState<PublicShowcaseCard[] | null>(null);
  const [listening, setListening] = useState(false);
  const railRef = useRef<HTMLDivElement>(null);
  const { data } = useBootstrap();
  const isAdmin = Boolean(data?.isAdmin);
  const loop = (clips?.length ?? 0) >= 4;
  useSlowRail(railRef, Boolean(clips?.length) && !listening, loop);

  function refresh(info?: { deletedId?: string }) {
    if (info?.deletedId) {
      setClips((rows) => (rows ?? []).filter((row) => row.id !== info.deletedId));
    }
    void listShowcaseClips()
      .then((rows) => setClips(rows))
      .catch(() => {
        if (info?.deletedId) return;
        setClips([]);
      });
  }

  useEffect(() => {
    let stop = false;
    void listShowcaseClips()
      .then((rows) => {
        if (!stop) setClips(rows);
      })
      .catch(() => {
        if (!stop) setClips([]);
      });
    return () => {
      stop = true;
    };
  }, []);

  if (clips === null) return null;
  if (clips.length === 0 && !isAdmin) return null;

  return (
    <section className="home-block showcase-block">
      <div className="showcase-head">
        <h2>İlham Al</h2>
        <p>Beğendiğin sahnenin tarifini al, tek dokunuşla yenisini üret.</p>
      </div>
      {clips.length ? (
        <div ref={railRef} className="showcase-rail">
          <div className="showcase-track">
            {[...clips, ...clips].map((clip, i) => (
              <Showca
... 