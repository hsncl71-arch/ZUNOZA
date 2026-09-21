import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { VideoThumb } from "@/components/studio-video";
import { getStudioHub, type HubItem } from "@/lib/zunoza/hub";

function hrefKind(item: HubItem) {
  if (item.kind === "video") return "video" as const;
  if (item.kind === "montage") return "montage" as const;
  if (item.kind === "image") return "image" as const;
  if (item.kind === "voice") return "voice" as const;
  if (item.kind === "music") return "music" as const;
  return "storyboard" as const;
}

const KIND: Record<HubItem["kind"], string> = {
  video: "Video",
  image: "Görsel",
  voice: "Ses",
  music: "Müzik",
  storyboard: "Klip",
  montage: "Montaj",
};

export function RecentWorks({ compact = false }: { compact?: boolean }) {
  const [items, setItems] = useState<HubItem[] | null>(null);
  useEffect(() => {
    getStudioHub()
      .then((hub) => setItems(hub.feed.slice(0, 12)))
      .catch(() => setItems([]));
  }, []);

  if (!items || items.length === 0) return null;

  return (
    <section className="home-block">
      <div className="flex items-end justify-between gap-3">
        <h2>Son Çalışmalar</h2>
        <Link to="/akis" className="text-xs text-accent">
          Tümü
        </Link>
      </div>
      <div className="thumb-row">
        {items.map((item) => {
          const kind = hrefKind(item);
          const inner = (
            <>
              <div className="thumb-media">
                {item.kind === "image" && item.url ? <img src={item.url} alt="" loading="lazy" decoding="async" /> : null}
                {item.kind === "video" && item.url ? <VideoThumb className="h-full w-full" src={item.url} label="Oynat" /> : null}
                {!(item.url && (item.kind === "image" || item.kind === "video")) ? (
                  <span>{KIND[item.kind]}</span>
                ) : null}
              </div>
              {compact ? null : <p className="mt-1 line-clamp-1 text-xs">{item.title}</p>}
            </>
          );
          if (kind === "video") {
            return (
              <Link key={`${item.kind}-${item.id}`} to="/videolarim/$jobId" params={{ jobId: item.id }} className="thumb-card">
                {inner}
              </Link>
            );
          }
          if (kind === "montage") {
            return (
              <Link key={`${item.kind}-${item.id}`} to="/montaj/$projectId" params={{ projectId: item.id }} className="thumb-card">
                {inner}
              </Link>
            );
          }
          const to =
            kind === "image" ? "/gorsel" : kind === "voice" ? "/seslendirme" : kind === "music" ? "/muzik" : "/storyboard";
          return (
            <Link key={`${item.kind}-${item.id}`} to={to} className="thumb-card">
              {inner}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
