import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppGate } from "@/components/gate";
import { ScreenLoader } from "@/components/screen-loader";
import { StudioHead } from "@/components/studio-head";
import { getStudioHub, type StudioStats } from "@/lib/zunoza/hub";

export const Route = createFileRoute("/analitik")({ component: Page });

function Page() {
  return (
    <AppGate>
      <Analytics />
    </AppGate>
  );
}

function Analytics() {
  const [stats, setStats] = useState<StudioStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    getStudioHub()
      .then((hub) => setStats(hub.stats))
      .catch((err) => setError(err instanceof Error ? err.message : "İstatistikler yüklenemedi."))
      .finally(() => setLoading(false));
  }, []);

  const rows = stats
    ? [
        ["Bakiye", String(stats.balance)],
        ["Kullanılan kredi", String(stats.creditsUsed)],
        ["Yüklenen kredi", String(stats.creditsGranted)],
        ["Toplam video", String(stats.videos)],
        ["Tamamlanan video", String(stats.completedVideos)],
        ["Görsel", String(stats.images)],
        ["TTS ses", String(stats.voices)],
        ["Müzik", String(stats.music)],
        ["Storyboard", String(stats.storyboards)],
        ["Montaj", String(stats.montages)],
      ]
    : [];

  return (
    <div className="space-y-5">
      <StudioHead kicker="İstatistikler" title="Üretim özeti" />
      {loading ? <ScreenLoader label="İstatistikler yükleniyor" /> : null}
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {!loading && !error && rows.length === 0 ? (
        <p className="text-sm text-muted">Henüz istatistik yok.</p>
      ) : null}
      <div className="grid grid-cols-2 gap-3">
        {rows.map(([label, value]) => (
          <article key={label} className="znz-panel p-4">
            <p className="text-xs text-muted">{label}</p>
            <p className="mt-1 font-display text-3xl tabular-nums">{value}</p>
          </article>
        ))}
      </div>
      <p className="text-xs text-subtle">
        Müzik: {stats?.musicReady ? "bağlı" : "bağlı değil"} · Montaj:{" "}
        {stats?.renderReady ? "bağlı" : "secret bekliyor"}
      </p>
      <Link to="/kredilerim" className="text-sm text-muted underline">
        Kredi hareketleri
      </Link>
    </div>
  );
}
