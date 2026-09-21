import { useEffect, useRef, useState, type ReactNode } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { muteInline, playLoud, playMuted, prepInlineVideo, stopInline } from "@/lib/zunoza/inline-video";

function mediaSrc(src: string) {
  return src.includes("?") ? `${src}&a=1` : `${src}?a=1`;
}

export function CardPreview({
  src,
  poster,
  title,
  className,
  videoClassName,
  onListen,
  children,
}: {
  src: string;
  poster?: string;
  title: string;
  className?: string;
  videoClassName?: string;
  onListen?: (on: boolean) => void;
  children?: ReactNode;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [soundOn, setSoundOn] = useState(false);
  const href = mediaSrc(src);

  useEffect(() => {
    const node = wrapRef.current;
    const video = videoRef.current;
    if (!node || !video) return;
    prepInlineVideo(video);
    video.muted = true;
    video.defaultMuted = true;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (video.getAttribute("src") !== href) {
            video.preload = entry.intersectionRatio >= 0.35 ? "auto" : "metadata";
            video.src = href;
          }
          if (entry.intersectionRatio >= 0.35) {
            if (video.muted) playMuted(video);
            else void video.play().catch(() => undefined);
          }
        } else {
          stopInline(video);
          setSoundOn(false);
          onListen?.(false);
        }
      },
      { threshold: [0, 0.15, 0.35, 0.7], rootMargin: "64px 24px" },
    );
    if (!reduced) io.observe(node);
    return () => {
      io.disconnect();
      stopInline(video);
      onListen?.(false);
    };
  }, [href, onListen]);

  function loud() {
    const video = videoRef.current;
    if (!video) return;
    if (video.getAttribute("src") !== href) video.src = href;
    void playLoud(video);
    setSoundOn(true);
    onListen?.(true);
  }

  function quiet() {
    const video = videoRef.current;
    if (!video) return;
    muteInline(video);
    setSoundOn(false);
    onListen?.(false);
  }

  return (
    <div
      ref={wrapRef}
      className={className}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        loud();
      }}
      role="button"
      tabIndex={0}
      aria-label={`${title} oynat`}
      onKeyDown={(e) => {
        if (e.key !== "Enter" && e.key !== " ") return;
        e.preventDefault();
        loud();
      }}
    >
      <video
        ref={videoRef}
        className={videoClassName}
        poster={poster}
        loop
        playsInline
        preload="metadata"
        controls={false}
        disablePictureInPicture
      />
      <button
        type="button"
        className="card-sound"
        aria-label={soundOn ? "Sesi kapat" : "Sesi aç"}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (soundOn) quiet();
          else loud();
        }}
      >
        {soundOn ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
      </button>
      {children}
    </div>
  );
}
