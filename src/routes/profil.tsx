import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { signOut } from "@/lib/auth/client";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { AppGate } from "@/components/gate";
import { StudioHead } from "@/components/studio-head";
import { Button } from "@/components/ui/button";
import { Choice, ChoiceRow } from "@/components/ui/choice";
import { useBootstrap } from "@/components/bootstrap";
import { useI18n, LOCALES } from "@/lib/i18n";
import { getProfileStats } from "@/lib/zunoza/api";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/profil")({ component: Page });

function Page() {
  return (
    <AppGate>
      <Profile />
    </AppGate>
  );
}

function Profile() {
  const user = useCurrentUser();
  const nav = useNavigate();
  const { data } = useBootstrap();
  const { locale, setLocale, t } = useI18n();
  const [videos, setVideos] = useState(0);
  const [spent, setSpent] = useState(0);
  const [bought, setBought] = useState(0);

  useEffect(() => {
    getProfileStats()
      .then((s) => {
        setVideos(s.videos);
        setSpent(s.spent);
        setBought(s.bought);
      })
      .catch(() => undefined);
  }, []);

  return (
    <div className="space-y-5">
      <StudioHead kicker="Hesap" title="Profilim" />
      <div className="znz-panel space-y-1 p-4">
        <p className="profile-stat"><span>Ad Soyad</span><strong>{data?.displayName ?? user?.displayName ?? "—"}</strong></p>
        <p className="profile-stat"><span>E-posta</span><strong className="truncate">{data?.email ?? user?.primaryEmail ?? "—"}</strong></p>
        <p className="profile-stat"><span>Kredi Bakiyesi</span><strong>{data?.unlimited ? "Sınırsız" : (data?.balance ?? 0)}</strong></p>
        <p className="profile-stat"><span>Aktif Paket</span><strong>{data?.packageId ?? "—"}</strong></p>
        {data?.premiumUntil ? (
          <p className="profile-stat"><span>Premium bitiş</span><strong>{new Date(data.premiumUntil).toLocaleDateString("tr-TR")}</strong></p>
        ) : null}
        <p className="profile-stat"><span>Satın Alınan Krediler</span><strong>{bought}</strong></p>
        <p className="profile-stat"><span>Kullanılan Krediler</span><strong>{spent}</strong></p>
        <p className="profile-stat"><span>Oluşturulan Video Sayısı</span><strong>{videos}</strong></p>
        {data?.blocked ? <p className="text-danger">Hesap durumu: durduruldu</p> : null}
        <div className="grid gap-2 pt-3">
          <span className="text-sm text-muted">{t("lang.label")}</span>
          <ChoiceRow>
            {LOCALES.map((id) => (
              <Choice key={id} selected={locale === id} onClick={() => setLocale(id)}>
                {t(id === "tr" ? "lang.tr" : "lang.en")}
              </Choice>
            ))}
          </ChoiceRow>
        </div>
      </div>
      <section className="znz-panel space-y-3 p-4">
        <p className="text-sm font-medium">Ödeme</p>
        <p className="text-xs text-muted">Kart bilgisi burada tutulmaz. Satın alma, ödeme sayfasında tamamlanır.</p>
        <Link to="/paketler" className="block">
          <Button type="button" className="w-full rounded-full">
            Satın Al / Abone Ol
          </Button>
        </Link>
        <Link to="/kredilerim" className="block text-center text-sm text-muted">
          Kredi hareketleri ve ödemelerim
        </Link>
      </section>
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="secondary"
          onClick={async () => {
            try {
              await signOut();
              nav({ to: "/login" });
            } catch {
              window.location.assign("/login");
            }
          }}
        >
          Çıkış Yap
        </Button>
        {data?.isAdmin ? (
          <Link to="/yonetici" className="text-accent">
            Yönetici paneli
          </Link>
        ) : null}
        <Link to="/verilerim" className="text-muted">
          Verilerim
        </Link>
        <Link to="/ana
... 