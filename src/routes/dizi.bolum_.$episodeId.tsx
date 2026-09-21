import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AppGate } from "@/components/gate";
import { Button } from "@/components/ui/button";
import { StudioHead } from "@/components/studio-head";
import { StudioVideo } from "@/components/studio-video";
import { JobProgress } from "@/components/job-progress";
import { ScreenLoader } from "@/components/screen-loader";
import {
  approveSeriesEpisode,
  getSeriesEpisode,
  retrySeriesScene,
  tickSeriesEpisode,
  updateSeriesEpisodePlan,
  type SeriesEpisode,
} from "@/lib/zunoza/series";
import { nextPollDelay } from "@/lib/zunoza/perf";
import { startMontageRender, getMontageProject } from "@/lib/zunoza/montage";
import { getBearerToken } from "@/lib/auth/client";
import { saveMediaFromUrl } from "@/lib/zunoza/save-media";

export const Route = createFileRoute("/dizi/bolum/$episodeId")({ component: Page });

function Page() {
  return (
    <AppGate>
      <EpisodeDesk />
    </AppGate>
  );
}

function EpisodeDesk() {
  const { episodeId } = Route.useParams();
  const [episode, setEpisode] = useState<SeriesEpisode | null>(null);
  const [seriesTitle, setSeriesTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const mergeLock = useRef(false);

  async function load(tick = false) {
    const next = tick
      ? { show: { title: seriesTitle }, episode: await tickSeriesEpisode({ data: { episodeId } }) }
      : await getSeriesEpisode({ data: { episodeId } });
    setSeriesTitle("show" in next && next.show ? next.show.title : seriesTitle);
    const ep = "episode" in next ? next.episode : next;
    if ("show" in next && next.show) setSeriesTitle(next.show.title);
    setEpisode(ep as SeriesEpisode);
    return ep as SeriesEpisode;
  }

  useEffect(() => {
    let stop = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let attempt = 0;
    async function loop() {
      try {
        const ep = await load(attempt > 0);
        if (stop) return;
        setError(null);
        if (ep.montageId && ep.status === "montaj" && ep.renderReady && !mergeLock.current) {
          mergeLock.current = true;
          try {
            await startMontageRender({ data: { id: ep.montageId } });
          } catch (err) {
            if (!stop) setError(err instanceof Error ? err.message : "Birleştirme başlatılamadı.");
            mergeLock.current = false;
          }
        }
        if (ep.montageId && (ep.status === "montaj" || ep.status === "klipler_hazir")) {
          try {
            const montage = await getMontageProject({ data: { id: ep.montageId } });
            if (montage.status === "tamamlandi" || montage.status === "render_ediliyor" || montage.status === "basarisiz") {
              await tickSeriesEpisode({ data: { episodeId } }).then(setEpisode);
            }
          } catch {
            /* keep polling */
          }
        }
        const live = ep.status === "uretiliyor" || ep.status === "montaj" || ep.status === "kismi_basarisiz";
        if (live) {
          timer = setTimeout(loop, nextPollDelay(attempt, 3500, 8000));
          attempt += 1;
        }
      } catch (err) {
        if (stop) return;
        setError(err instanceof Error ? err.message : "Bölüm yüklenemedi.");
        if (attempt < 6) {
          timer = setTimeout(loop, nextPollDelay(attempt, 4000, 9000));
          attempt += 1;
        }
      }
    }
    void getSeriesEpisode({ data: { episodeId } })
      .then((pack) => {
        setSeriesTitle(pack.show.title);
        setEpisode(pack.episode);
        if (pack.episode.status === "uretiliyor" || pack.episode.status === "montaj" || pack.episode.status === "kismi_basarisiz") {
          void loop();
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Bölüm yüklenemedi."));
    return () => {
      stop = true;
      if (timer) clearTimeout(timer);
    };
  }, [episodeId]);

  async function onApprove() {
    setBusy(true);
    setErro
... 