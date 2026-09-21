import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppGate } from "@/components/gate";
import { Button } from "@/components/ui/button";
import { deleteVideoJob, getVideoJob, type VideoJob } from "@/lib/zunoza/api";
import { formatDate, statusLabel } from "@/routes/videolarim";
import { useBootstrap } from "@/components/bootstrap";

export const Route = createFileRoute("/videolarim/$jobId")({ component: Page });

function Page() {
  return (
    <AppGate>
      <Detail />
    </AppGate>
  );
}

function Detail() {
  const { jobId } = Route.useParams();
  const nav = useNavigate();
  const { refresh } = useBootstrap();
  const [job, setJob] = useState<VideoJob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);

  useEffect(() => {
    let stop = false;
    async function tick() {
      try {
        const next = await getVideoJob({ data: { id: jobId } });
        if (!stop) setJob(next);
        if (next.status !== "tamamlandi" && next.status !== "basarisiz") {
          setTimeout(tick, 3000);
        } else {
          refresh();
        }
      } catch (err) {
        if (!stop) setError(err instanceof Error ? err.message : "Video yüklenemedi.");
      }
    }
    void tick();
    return () => {
      stop = true;
    };
  }, [jobId, refresh]);

  async function onDelete() {
    await deleteVideoJob({ data: { id: jobId } });
    nav({ to: "/videolarim" });
  }

  if (error) return <p className="text-danger">{error}</p>;
  if (!job) return <p className="text-muted">Yükleniyor…</p>;

  return (
    <div className="space-y-5">
      <Link to="/videolarim" className="text-sm text-muted">
        ← Videolarım
      </Link>
      <h1 className="font-display text-3xl">{statusLabel(job.status)}</h1>
      {job.videoUrl && job.status === "tamamlandi" ? (
        <video src={job.videoUrl} controls playsInline className="w-full rounded-2xl bg-bg" />
      ) : (
        <div className="grid aspect-video place-items-center rounded-2xl bg-elevated text-muted">
          {statusLabel(job.status)}
        </div>
      )}
      {job.errorMessage ? <p className="text-sm text-danger">{job.errorMessage}</p> : null}
      <p>{job.prompt}</p>
      <dl className="grid grid-cols-2 gap-2 text-sm text-muted">
        <div>Model: {job.model}</div>
        <div>Süre: {job.durationSeconds} sn</div>
        <div>Çözünürlük: {job.quality}</div>
        <div>Kredi: {job.creditCost}</div>
        <div>Tarih: {formatDate(job.createdAt)}</div>
        <div>Oran: {job.aspect}</div>
      </dl>
      <div className="flex flex-wrap gap-2">
        {job.videoUrl ? (
          <Button
            onClick={async () => {
              const { getBearerToken } = await import("@/lib/auth/client");
              const token = getBearerToken();
              const res = await fetch(`/api/videolar/${job.id}/indir`, {
                credentials: "include",
                headers: token ? { Authorization: `Bearer ${token}` } : {},
              });
              if (!res.ok) return;
              const blob = await res.blob();
              const href = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = href;
              a.download = `zunoza-${job.id}.mp4`;
              a.rel = "noopener";
              document.body.appendChild(a);
              a.click();
              a.remove();
              URL.revokeObjectURL(href);
            }}
          >
            MP4 İndir
          </Button>
        ) : null}
        <Link to="/olustur">
          <Button variant="secondary">Yeniden Oluştur</Button>
        </Link>
        <Button
          variant="ghost"
          onClick={() => {
            void navigator.clipboard.writeText(job.prompt);
          }}
        >
          Promptu Kopyala
        </Button>
        {confirm ? (
          <Button variant="danger" onClick={onDelete}>
            Emin misiniz? Sil
          </Button>
        ) : (
   
... 