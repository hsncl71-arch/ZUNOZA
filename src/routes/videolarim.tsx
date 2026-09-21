import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppGate } from "@/components/gate";
import { ScreenLoader } from "@/components/screen-loader";
import { VideoThumb } from "@/components/studio-video";
import { Button } from "@/components/ui/button";
import { jobStatusLabel, listVideoJobs, type VideoJob } from "@/lib/zunoza/api";
import { nextPollDelay } from "@/lib/zunoza/perf";
import { videoProgressCopy } from "@/lib/zunoza/studio-handoff";

export const Route = createFileRoute("/videolarim")({ component: Page });

const FILTERS = [
  { id: "all", label: "Tümü" },
  { id: "running", label: "Oluşturuluyor" },
  { id: "done", label: "Tamamlananlar" },
  { id: "fail", label: "Başarısız" },
] as const;

function Page() {
  return (
    <AppGate>
      <List />
    </AppGate>
  );
}

function List() {
  const [jobs, setJobs] = useState<VideoJob[]>([]);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [visibleCount, setVisibleCount] = useState(24);

  useEffect(() => {
    let stop = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let attempt = 0;
    async function tick() {
      try {
        const next = await listVideoJobs();
        if (stop) return;
        setJobs(next);
        setLoadError(false);
        const running = next.some((j) => j.status !== "tamamlandi" && j.status !== "basarisiz");
        if (running) {
          timer = setTimeout(tick, nextPollDelay(attempt, 4000, 10000));
          attempt += 1;
        }
      } catch {
        if (!stop) {
          setLoadError(true);
          timer = setTimeout(tick, nextPollDelay(attempt, 4000, 10000));
        }
        attempt += 1;
      } finally {
        if (!stop) setLoading(false);
      }
    }
    void tick();
    return () => {
      stop = true;
      if (timer) clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    const running = jobs.some((j) => j.status !== "tamamlandi" && j.status !== "basarisiz");
    if (!running) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [jobs]);

  const visible = jobs.filter((j) => {
    if (filter === "running") return j.status !== "tamamlandi" && j.status !== "basarisiz";
    if (filter === "done") return j.status === "tamamlandi";
    if (filter === "fail") return j.status === "basarisiz";
    return true;
  });
  const shown = visible.slice(0, visibleCount);

  return (
    <div className="space-y-5">
      <StudioHead kicker="Kütüphane" title="Videolarım" />
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`min-h-11 rounded-full px-3 text-sm ${filter === f.id ? "bg-accent text-accent-fg" : "bg-elevated"}`}
          >
            {f.label}
          </button>
        ))}
      </div>
      {loading ? <ScreenLoader label="Videolar yükleniyor" /> : null}
      {!loading && loadError && visible.length === 0 ? (
        <p className="text-sm text-muted">Videolar yüklenemedi. Bağlantınızı kontrol edip tekrar deneyin.</p>
      ) : null}
      {!loading && !loadError && visible.length === 0 ? (
        <div className="znz-empty">
          <p>Henüz video yok. İlk sahnenizi oluşturun.</p>
          <Link to="/olustur" className="mt-2 inline-flex">
            <Button>Video Oluştur</Button>
          </Link>
        </div>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        {shown.map((j) => {
          const progress = videoProgressCopy(j.status, j.createdAt, now);
          return (
            <Link
              key={j.id}
              to="/videolarim/$jobId"
              params={{ jobId: j.id }}
              className="znz-panel p-4"
            >
              <div className="
... 