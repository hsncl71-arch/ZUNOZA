import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Crown, FolderKanban, Home, Menu, Sparkles, UserRound } from "lucide-react";
import { ZunozaGlyph, ZunozaWordmark } from "@/components/logo";
import { SideMenu } from "@/components/side-menu";
import { Composer } from "@/components/composer";
import { useBootstrap } from "@/components/bootstrap";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { SiteFooter } from "@/components/site-footer";
import { RouteFlash } from "@/components/route-flash";
import { isLegalChromePath, isLegalDocPath } from "@/lib/zunoza/legal";

function navActive(pathname: string, to: string) {
  if (to === "/") return pathname === "/";
  return pathname === to || pathname.startsWith(`${to}/`);
}

function NoticeBar() {
  const { data } = useBootstrap();
  if (!data?.notice) return null;
  return (
    <div className="border-b border-border bg-surface px-3 py-2 text-center text-xs text-muted">
      <strong className="text-fg">{data.notice.title}</strong>
      <span className="ml-1">{data.notice.body}</span>
    </div>
  );
}

function PlanChip() {
  return (
    <Link to="/premium" className="premium-badge" aria-label="Premium">
      <Crown className="size-3.5" strokeWidth={2} />
      PREMIUM
    </Link>
  );
}

function ProfileMark() {
  const user = useCurrentUser();
  const photo = user?.profileImageUrl?.trim();
  return (
    <Link to="/profil" className="profile-orb" aria-label="Profil">
      <span className="profile-orb-inner">
        {photo ? (
          <img src={photo} alt="" />
        ) : (
          <UserRound className="size-4" strokeWidth={1.75} />
        )}
      </span>
    </Link>
  );
}

function CompactHeader({ onMenu, showPlan = true }: { onMenu: () => void; showPlan?: boolean }) {
  return (
    <header className="glass-bar sticky top-0 z-30 border-b border-border pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-2 px-3">
        <div className="flex min-w-0 items-center gap-1.5">
          <button
            type="button"
            className="grid size-11 shrink-0 place-items-center rounded-full text-fg"
            aria-label="Menü"
            onClick={onMenu}
          >
            <Menu className="size-5" strokeWidth={1.75} />
          </button>
          <Link to="/" className="flex min-w-0 items-center gap-2" aria-label="ZUNOZA ana sayfa">
            <ZunozaGlyph className="h-7 w-7 shrink-0" />
            <ZunozaWordmark />
          </Link>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {showPlan ? <PlanChip /> : null}
          <ProfileMark />
        </div>
      </div>
    </header>
  );
}

function BottomTabs() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const tabs = [
    { to: "/", label: "Ana Sayfa", icon: Home },
    { to: "/olustur", label: "Oluştur", icon: Sparkles },
    { to: "/projeler", label: "Projeler", icon: FolderKanban },
  ] as const;
  return (
    <nav className="bottom-dock" aria-label="Ana gezinme">
      <div className="bottom-dock-inner">
        {tabs.map((item) => {
          const Icon = item.icon;
          const active = navActive(pathname, item.to);
          return (
            <Link key={item.to} to={item.to} className={`tab-link ${active ? "is-active" : ""}`}>
              <Icon className="size-5" strokeWidth={1.75} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function hideComposerOn(pathname: string) {
  return pathname !== "/asistan";
}

function hideFooterOn(pathname: string) {
  if (pathname === "/" || pathname === "/asistan") return true;
  return (
    pathname.startsWith("/olustur") ||
    pathname.startsWith("/gorsel") ||
    pathname.startsWith("/muzik") ||
    pathname.startsWith("/seslendirme") ||
    pathname.startsWith("/storyboard") ||
    pathname.startsWith("/montaj") ||
    pathname.startsWi
... 