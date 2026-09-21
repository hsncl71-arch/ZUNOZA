import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppGate } from "@/components/gate";
import { StudioHead } from "@/components/studio-head";
import { ScreenLoader } from "@/components/screen-loader";
import { VideoThumb } from "@/components/studio-video";
import { getStudioHub, type HubItem } from "@/lib/zunoza/hub";

export const Route = createFileRoute("/akis")({ component: Page });

function Page() {
  return (
    <AppGate>
      <Feed />
    </AppGate>
  );
}

function hrefKind(item: HubItem) {
  if (item.kind === "video") return "video" as const;
  if (item.kind === "montage") return "montage" as const;
  if (item.kind === "image") return "image" as const;
  if (item.kind === "voice") return "voice" as const;
  if (item.kind === "music") return "music" as const;
  return "storyboard" as const;
}

function Feed() {
  const [items, setItems] = useState<HubItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    getStudioHub()
      .then((hub) => setItems(hub.feed))
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Son çalışmalar yüklenemedi.");
        setItems([]);
      });
  }, []);

  return (
    <div className="space-y-5">
      <StudioHead kicker="Son Çalışmalar" title="Son çalışmalar" />
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {items === null ? <ScreenLoader label="Çalışmalar yükleniyor" /> : null}
      {items && items.length === 0 && !error ? <p className="text-sm text-muted">Henüz üretim yok.</p> : null}
      <div className="grid grid-cols-2 gap-3">
        {(items ?? []).map((item) => {
          const kind = hrefKind(item);
          const inner = (
            <>
              <p className="text-xs uppercase tracking-wide text-subtle">{item.kind}</p>
              {item.kind === "image" && item.url ? (
                <img src={item.url} alt="" className="mt-2 aspect-square w-full rounded-xl object-cover" loading="lazy" decoding="async" />
              ) : null}
              {item.kind === "video" && item.url ? (
                <VideoThumb className="mt-2 aspect-video w-full rounded-xl" src={item.url} label="Oynat" />
              ) : null}
              <p className="mt-2 line-clamp-2 text-sm">{item.title}</p>
            </>
          );
          const cls = "studio-card min-h-0";
          if (kind === "video") {
            return (
              <Link key={`${item.kind}-${item.id}`} to="/videolarim/$jobId" params={{ jobId: item.id }} className={cls}>
                {inner}
              </Link>
            );
          }
          if (kind === "montage") {
            return (
              <Link key={`${item.kind}-${item.id}`} to="/montaj/$projectId" params={{ projectId: item.id }} className={cls}>
                {inner}
              </Link>
            );
          }
          const to =
            kind === "image" ? "/gorsel" : kind === "voice" ? "/seslendirme" : kind === "music" ? "/muzik" : "/storyboard";
          return (
            <Link key={`${item.kind}-${item.id}`} to={to} className={cls}>
              {inner}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
