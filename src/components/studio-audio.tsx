import { forwardRef, useEffect, useRef } from "react";
import { getBearerToken } from "@/lib/auth/client";

type Props = {
  src?: string | null;
  className?: string;
  preload?: "none" | "metadata" | "auto";
  onTimeUpdate?: React.ReactEventHandler<HTMLAudioElement>;
};

export const StudioAudio = forwardRef<HTMLAudioElement, Props>(function StudioAudio(
  { src, className, preload = "metadata", onTimeUpdate },
  ref,
) {
  const inner = useRef<HTMLAudioElement | null>(null);
  const blobRef = useRef<string | null>(null);
  const tried = useRef(false);

  function setRefs(el: HTMLAudioElement | null) {
    inner.current = el;
    if (typeof ref === "function") ref(el);
    else if (ref) ref.current = el;
  }

  useEffect(() => {
    tried.current = false;
    return () => {
      if (blobRef.current) {
        URL.revokeObjectURL(blobRef.current);
        blobRef.current = null;
      }
    };
  }, [src]);

  async function loadBlob() {
    if (!src || !inner.current || tried.current) return;
    tried.current = true;
    try {
      const token = getBearerToken();
      const res = await fetch(src, {
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) return;
      const buf = await res.arrayBuffer();
      if (buf.byteLength < 32) return;
      if (blobRef.current) URL.revokeObjectURL(blobRef.current);
      const url = URL.createObjectURL(new Blob([buf], { type: "audio/mpeg" }));
      blobRef.current = url;
      inner.current.src = url;
      inner.current.load();
    } catch {
      /* keep failed native src */
    }
  }

  if (!src) return null;
  return (
    <audio
      ref={setRefs}
      src={src}
      controls
      preload={preload}
      className={className ?? "w-full"}
      onTimeUpdate={onTimeUpdate}
      onError={() => {
        if (blobRef.current) return;
        void loadBlob();
      }}
    />
  );
});
