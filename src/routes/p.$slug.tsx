import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BuilderPreview } from "@/components/builder-preview";
import { getPublishedBuilderApp } from "@/lib/zunoza/builder";

export const Route = createFileRoute("/p/$slug")({ component: Page });

function Page() {
  const { slug } = Route.useParams();
  const [app, setApp] = useState<{ name: string; html: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stop = false;
    getPublishedBuilderApp({ data: { slug } })
      .then((next) => {
        if (!stop) setApp(next);
      })
      .catch((err) => {
        if (!stop) setError(err instanceof Error ? err.message : "Uygulama bulunamadı.");
      });
    return () => {
      stop = true;
    };
  }, [slug]);

  if (error) {
    return (
      <div className="grid min-h-[70vh] place-items-center px-6 text-center">
        <div className="space-y-3">
          <p className="text-sm text-muted">{error}</p>
          <Link to="/" className="text-sm text-accent">
            ZUNOZA’ya dön
          </Link>
        </div>
      </div>
    );
  }
  if (!app) {
    return (
      <div className="grid min-h-[70vh] place-items-center px-6 text-sm text-muted">Uygulama açılıyor…</div>
    );
  }
  return (
    <div className="builder-public">
      <header className="builder-public-bar">
        <p className="truncate text-sm">{app.name}</p>
        <Link to="/" className="text-xs text-muted">
          ZUNOZA ile yapıldı
        </Link>
      </header>
      <BuilderPreview html={app.html} device="full" chrome={false} />
    </div>
  );
}
