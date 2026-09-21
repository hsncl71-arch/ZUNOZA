import { createRootRoute, HeadContent, Link, Navigate, Outlet, Scripts, useRouterState } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/provider";
import { I18nProvider } from "@/lib/i18n";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { BootstrapProvider } from "@/components/bootstrap";
import { Shell } from "@/components/shell";
import { useStickyUser } from "@/components/gate";
import { FullScreenLoader } from "@/components/screen-loader";
import { WelcomeScreen } from "@/components/welcome-screen";
import { NativeShell } from "@/components/native-shell";
import appCss from "../styles.css?url";

const APP_NAME = "ZUNOZA AI VIDEO";

const PUBLIC_PATHS = new Set([
  "/",
  "/login",
  "/paketler",
  "/premium",
  "/giris-donus",
  "/hakkimizda",
  "/iletisim",
  "/gizlilik",
  "/cerez-politikasi",
  "/kvkk-aydinlatma",
  "/kullanim-kosullari",
  "/on-bilgilendirme",
  "/mesafeli-satis",
  "/teslimat-iade",
  "/iptal-iade",
]);

function isOpenPath(pathname: string) {
  if (PUBLIC_PATHS.has(pathname)) return true;
  return pathname.startsWith("/p/");
}

function AppFrame() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user, isPending } = useStickyUser();

  if (pathname === "/login" || pathname.startsWith("/p/")) return <Outlet />;

  if (user) {
    return (
      <Shell>
        <Outlet />
        <WelcomeScreen />
      </Shell>
    );
  }

  if (isPending && !isOpenPath(pathname)) {
    return (
      <FullScreenLoader />
    );
  }

  if (!user && !isPending && !isOpenPath(pathname)) {
    return <Navigate to="/login" />;
  }

  return <Outlet />;
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: APP_NAME },
      { name: "theme-color", content: "#05050a" },
      { name: "apple-mobile-web-app-title", content: "ZUNOZA" },
      {
        name: "description",
        content: "Metninizi veya görselinizi saniyeler içinde yapay zekâ videosuna dönüştürün.",
      },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/__grok/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/icon-180.png" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=Outfit:wght@400;500;600&display=swap",
      },
    ],
  }),
  component: () => (
    <html lang="tr" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <PreviewHostBridge />
        <NativeShell />
        <AuthProvider>
          <I18nProvider>
            <BootstrapProvider>
              <AppFrame />
            </BootstrapProvider>
          </I18nProvider>
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  ),
  notFoundComponent: () => (
    <div className="grid min-h-[50vh] place-items-center px-6 text-center">
      <div className="space-y-3">
        <p className="text-sm text-muted">Bu sayfa bulunamadı.</p>
        <Link to="/" className="text-sm text-accent">
          Ana sayfaya dön
        </Link>
      </div>
    </div>
  ),
});
