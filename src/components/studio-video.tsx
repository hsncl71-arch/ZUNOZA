import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

type Props = {
  src: string;
  className?: string;
  controls?: boolean;
  muted?: boolean;
};

export function VideoThumb({
  className,
  label,
  src,
}: {
  className?: string;
  label?: string;
  src?: string | null;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(false);
    const el = ref.current;
    if (!el || !src) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { rootMargin: "160px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [src]);

  return (
    <div ref={ref} className={`relative grid place-items-center overflow-hidden bg-elevated text-sm text-muted ${className ?? ""}`}>
      {src && inView ? (
        <video
          src={src}
          muted
          playsInline
          preload="metadata"
          className="absolute inset-0 h-full w-full object-cover"
          onLoadedData={() => setReady(true)}
          onError={(e) => {
            e.currentTarget.style.display = "none";
            setReady(false);
          }}
        />
      ) : null}
      {ready ? null : <span className="relative z-10">{label || "Oynat"}</span>}
    </div>
  );
}

export function StudioVideo({ src, className, controls = true, muted = false }: Props) {
  const ref = useRef<HTMLVideoElement>(null);
  const blobRef = useRef<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const thumb = !controls;

  useEffect(() => {
    setFailed(false);
    return () => {
      if (blobRef.current) {
        URL.revokeObjectURL(blobRef.current);
        blobRef.current = null;
      }
    };
  }, [src]);

  async function loadAsBlob() {
    setBusy(true);
    setFailed(false);
    try {
      const { getBearerToken } = await import("@/lib/auth/client");
      const token = getBearerToken();
      const res = await fetch(src, {
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Video alınamadı.");
      const buf = await res.arrayBuffer();
      if (buf.byteLength < 32) throw new Error("Video dosyası boş.");
      if (blobRef.current) URL.revokeObjectURL(blobRef.current);
      const url = URL.createObjectURL(new Blob([buf], { type: "video/mp4" }));
      blobRef.current = url;
      const el = ref.current;
      if (!el) return;
      el.src = url;
      el.load();
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  if (failed) {
    if (thumb) return <div className={`rounded-2xl bg-elevated ${className ?? ""}`} />;
    return (
      <div className={`grid place-items-center gap-3 rounded-2xl bg-elevated p-6 text-center ${className ?? ""}`}>
        <p className="text-sm text-muted">Video yüklenemedi – tekrar dene</p>
        <Button type="button" variant="secondary" onClick={() => void loadAsBlob()} disabled={busy}>
          {busy ? "Yükleniyor…" : "Tekrar dene"}
        </Button>
      </div>
    );
  }

  return (
    <video
      ref={(el) => {
        ref.current = el;
        if (!el) return;
        el.setAttribute("playsinline", "true");
        el.setAttribute("webkit-playsinline", "true");
      }}
      src={src}
      className={className}
      controls={controls}
      muted={muted}
      playsInline
      preload={thumb ? "none" : "metadata"}
      onError={() => {
        if (thumb) {
          setFailed(true);
          return;
        }
        if (blobRef.current) {
          setFailed(true);
          return;
        }
        void loadAsBlob();
      }}
    />
  );
}
