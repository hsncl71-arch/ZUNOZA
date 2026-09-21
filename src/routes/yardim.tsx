import { createFileRoute, Link } from "@tanstack/react-router";
import { AppGate } from "@/components/gate";
import { StudioHead } from "@/components/studio-head";

export const Route = createFileRoute("/yardim")({ component: Page });

function Page() {
  return (
    <AppGate>
      <Help />
    </AppGate>
  );
}

function Help() {
  return (
    <div className="space-y-5">
      <StudioHead kicker="Destek" title="Yardım">
        ZUNOZA, metinden video, görsel, seslendirme, müzik ve montaj üretmeniz için tasarlandı.
      </StudioHead>
      <section className="znz-panel space-y-4 p-5 text-sm leading-relaxed text-muted">
        <p>ZUNOZA, metinden video, görsel, seslendirme, müzik ve montaj üretmeniz için tasarlandı.</p>
        <p>Kredi bakiyeniz üst çubukta görünür. Üretim tamamlanınca Videolarım ve Son Çalışmalar’da yer alır.</p>
        <p>Giriş için e-posta, Google veya X kullanabilirsiniz.</p>
        <div className="flex flex-col gap-2 pt-2">
          <Link to="/hata-bildir" className="text-accent">
            Hata bildir
          </Link>
          <Link to="/istek-oneri" className="text-accent">
            İstek veya öneri gönder
          </Link>
        </div>
      </section>
    </div>
  );
}
