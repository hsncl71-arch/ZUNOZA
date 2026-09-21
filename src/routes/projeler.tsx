import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppGate } from "@/components/gate";
import { ScreenLoader } from "@/components/screen-loader";
import { StudioHead } from "@/components/studio-head";
import { Button } from "@/components/ui/button";
import { getStudioHub } from "@/lib/zunoza/hub";
import { listStoryboards } from "@/lib/zunoza/api";
import { listBuilderProjects } from "@/lib/zunoza/builder";

export const Route = createFileRoute("/projeler")({ component: Page });

function Page() {
  return (
    <AppGate>
      <Projects />
    </AppGate>
  );
}

function Projects() {
  const [hub, setHub] = useState<Awaited<ReturnType<typeof getStudioHub>> | null>(null);
  const [boards, setBoards] = useState<Awaited<ReturnType<typeof listStoryboards>>>([]);
  const [apps, setApps] = useState<Awaited<ReturnType<typeof listBuilderProjects>>>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getStudioHub(), listStoryboards(), listBuilderProjects()])
      .then(([next, story, built]) => {
        setHub(next);
        setBoards(story);
        setApps(built);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Projeler yüklenemedi."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-5">
      <StudioHead kicker="Projelerim" title="Tüm üretimler" />
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {loading ? <ScreenLoader label="Projeler yükleniyor" /> : null}

      {loading ? null : (
      <>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="studio-section">İnşa Et</h2>
          <Link to="/insa-et" className="text-sm text-muted">Yeni</Link>
        </div>
        {apps.length === 0 ? <p className="text-sm text-muted">Henüz uygulama yok.</p> : null}
        {apps.map((p) => (
          <Link key={p.id} to="/insa-et/$projectId" params={{ projectId: p.id }} className="znz-panel block px-4 py-3 text-sm">
            <strong className="block">{p.name}</strong>
            <span className="text-xs text-muted">
              {p.status === "hazir" ? "Hazır" : p.status === "hata" ? "Hata" : "Hazırlanıyor"}
              {" · "}
              {Number.isFinite(Date.parse(p.updatedAt)) ? new Date(p.updatedAt).toLocaleDateString("tr-TR") : ""}
              {" · Düzenlemeye devam et"}
            </span>
          </Link>
        ))}
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="studio-section">Videolar</h2>
          <Link to="/videolarim" className="text-sm text-muted">Tümü</Link>
        </div>
        {(hub?.videos.length ?? 0) === 0 ? <p className="text-sm text-muted">Video yok.</p> : null}
        {hub?.videos.slice(0, 6).map((v) => (
          <Link key={v.id} to="/videolarim/$jobId" params={{ jobId: v.id }} className="znz-panel block px-4 py-3 text-sm">
            {v.title}
            <span className="mt-1 block text-xs text-muted">
              {v.status === "tamamlandi" ? "Tamamlandı" : v.status === "basarisiz" ? "Başarısız" : "Hazırlanıyor"}
              {Number.isFinite(Date.parse(v.createdAt)) ? ` · ${new Date(v.createdAt).toLocaleDateString("tr-TR")}` : ""}
            </span>
          </Link>
        ))}
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="studio-section">Görseller</h2>
          <Link to="/gorsel" className="text-sm text-muted">Stüdyo</Link>
        </div>
        {(hub?.images.length ?? 0) === 0 ? <p className="text-sm text-muted">Görsel yok.</p> : null}
        <div className="grid grid-cols-3 gap-2">
          {hub?.images.slice(0, 6).map((img) => (
            <Link key={img.id} to="/gorsel" className="overflow-hidden rounded-xl">
              {img.url ? <img src={img.url} alt="" className="aspect-square w-full object-cover" /> : null}
            </Link>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
       
... 