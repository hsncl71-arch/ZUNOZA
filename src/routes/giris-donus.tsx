import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { authClient } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export const Route = createFileRoute("/giris-donus")({ component: OAuthReturn });

function OAuthReturn() {
  const { user, isPending } = useCurrentUserState();

  useEffect(() => {
    if (user) {
      window.location.replace("/");
      return;
    }
    if (isPending) return;
    let cancelled = false;
    void authClient.getSession().then((res) => {
      if (cancelled) return;
      if (res.data?.user) window.location.replace("/");
      else window.location.replace("/login?error=oauth");
    });
    const t = window.setTimeout(() => {
      if (!cancelled) window.location.replace("/login?error=oauth");
    }, 10_000);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [user, isPending]);

  return (
    <main className="relative grid min-h-dvh place-items-center bg-bg px-4 py-10 text-fg">
      <div className="hero-wash pointer-events-none absolute inset-0 opacity-70" />
      <p className="relative text-muted">Giriş tamamlanıyor…</p>
    </main>
  );
}
