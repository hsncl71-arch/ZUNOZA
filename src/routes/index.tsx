import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Clapperboard,
  Film,
  Images,
  Layers,
  Mic2,
  Music,
  RectangleVertical,
  Sparkles,
  Hammer,
  Heart,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { GuestShell } from "@/components/shell";
import { ShowcaseReel } from "@/components/showcase-reel";
import { AdminClipBar } from "@/components/admin-clip-bar";
import { useBootstrap } from "@/components/bootstrap";
import { CardPreview } from "@/components/card-preview";
import { listDiscoverClips } from "@/lib/zunoza/showcase-api";
import { SHOWCASE_BADGE_LABEL, type PublicShowcaseCard } from "@/lib/zunoza/showcase";
import { PROMPT_KEYS } from "@/lib/zunoza/studio-handoff";
import { requestLiveStart } from "@/lib/zunoza/composer-events";

export const Route = createFileRoute("/")({ component: Home });

type StudioTo = "/olustur" | "/gorsel" | "/muzik" | "/seslendirme" | "/storyboard" | "/kapak" | "/montaj" | "/asistan";

function studioTo(path: string): StudioTo {
  if (
    path === "/olustur" ||
    path === "/gorsel" ||
    path === "/muzik" ||
    path === "/seslendirme" ||
    path === "/storyboard" ||
    path === "/kapak" ||
    path === "/montaj" ||
    path === "/asistan"
  ) {
    return path;
  }
  return "/olustur";
}

function stash(prompt: string, to: StudioTo) {
  try {
    const key =
      to === "/olustur"
        ? PROMPT_KEYS.olustur
        : to === "/gorsel" || to === "/kapak"
          ? PROMPT_KEYS.gorsel
          : to === "/muzik"
            ? PROMPT_KEYS.muzik
            : to === "/seslendirme"
              ? PROMPT_KEYS.voice
              : to === "/storyboard"
                ? PROMPT_KEYS.clip
                : null;
    if (key) sessionStorage.setItem(key, JSON.stringify({ prompt }));
  } catch {
    /* ignore */
  }
}

function MediaCard({
  item,
  admin,
  onChanged,
}: {
  item: PublicShowcaseCard;
  admin: boolean;
  onChanged: () => void;
}) {
  const to = studioTo(item.studioPath);
  const prompt = item.prompt || item.scene;
  return (
    <article className="discover-card">
      <CardPreview
        src={item.previewUrl}
        poster={item.posterUrl || undefined}
        title={item.title}
        className="media-card"
        videoClassName="media-video"
      >
        {item.badge && SHOWCASE_BADGE_LABEL[item.badge as keyof typeof SHOWCASE_BADGE_LABEL] ? (
          <span className={`showcase-badge is-${item.badge}`}>
            {SHOWCASE_BADGE_LABEL[item.badge as keyof typeof SHOWCASE_BADGE_LABEL]}
          </span>
        ) : null}
        {item.title ? (
          <div className="media-meta">
            <strong>{item.title}</strong>
          </div>
        ) : null}
      </CardPreview>
      <Link to={to} className="showcase-cta" onClick={() => stash(prompt, to)}>
        Aynısını Oluştur
      </Link>
      {admin ? <AdminClipBar lane="kesfet" clipId={item.id} title={item.title} onChanged={onChanged} /> : null}
    </article>
  );
}

const STUDIOS = [
  { to: "/insa-et" as const, icon: Hammer, title: "İnşa Et", text: "Uygulamanı yap", src: "/discover/istanbul.jpg" },
  { to: "/olustur" as const, icon: Clapperboard, title: "AI Video", text: "Metinden video", src: "/discover/kapadokya.jpg" },
  { to: "/kapak" as const, icon: Film, title: "Kapak", text: "Video kapağı", src: "/discover/urun.jpg" },
  { to: "/montaj" as const, icon: Layers, title: "Montaj Stüdyosu", text: "Kendi videolarını birleştir", src: "/discover/araba.jpg" },
  { to: "/gorsel" as const, icon: Images, title: "AI Görsel", text: "Fotoğraf üret", src: "/discover/portre.jpg" },
  { to: "/muzik" as const, icon: Music, title: "Müzik", text: "Şarkı üret", src: "/discover/konser.jpg" },
  { to: "/seslendirme" as const, icon: Mic2, title: "Ses", text: "Türkçe ses", src: "/discover/kafe.jpg" },
  { to: "/storyboard" as const, icon: RectangleVertical, title: "Klip", text: "Sahne planı", src: "/discover/mutfak.jpg" },
];

function AskLaunch() {
  const nav = useNavigate();
  return (
    <div className="ask-launch">
      <Link to="/asistan" className="ask-launch-main">
        <span className="ask-launch-icon">
          <Sparkles className="size-5" strokeWidth={1.8} />
        </span>
        <span className="ask-launch-c
... 