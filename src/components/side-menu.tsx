import { Link } from "@tanstack/react-router";
import {
  Bug,
  CircleHelp,
  CreditCard,
  Layers,
  Lightbulb,
  Mail,
  Settings,
  Shield,
  X,
} from "lucide-react";
import { ZunozaMark } from "@/components/logo";

const ITEMS = [
  { to: "/ayarlar", label: "Ayarlar", icon: Settings },
  { to: "/verilerim", label: "Verilerim", icon: Shield },
  { to: "/paketler", label: "Satın Al", icon: CreditCard },
  { to: "/iletisim", label: "İletişim", icon: Mail },
  { to: "/yardim", label: "Yardım", icon: CircleHelp },
  { to: "/hata-bildir", label: "Hata Bildir", icon: Bug },
  { to: "/istek-oneri", label: "İstek Öneri", icon: Lightbulb },
] as const;

export function SideMenu({
  open,
  onClose,
  pathname,
}: {
  open: boolean;
  onClose: () => void;
  pathname: string;
}) {
  return (
    <div className={`drawer ${open ? "is-open" : ""}`} aria-hidden={!open}>
      <button type="button" className="drawer-scrim" aria-label="Menüyü kapat" onClick={onClose} />
      <aside className="drawer-panel" role="dialog" aria-label="Menü">
        <div className="flex items-center justify-between gap-3 px-5 pb-6 pt-5">
          <Link to="/" className="min-w-0" aria-label="ZUNOZA ana sayfa" onClick={onClose}>
            <ZunozaMark className="h-8" />
          </Link>
          <button
            type="button"
            className="grid size-11 place-items-center rounded-full bg-elevated text-muted"
            onClick={onClose}
            aria-label="Kapat"
          >
            <X className="size-5" strokeWidth={1.75} />
          </button>
        </div>
        <nav className="flex flex-col gap-1 px-3">
          {ITEMS.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.to || pathname.startsWith(`${item.to}/`);
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={`flex min-h-12 items-center gap-3 rounded-2xl px-3 text-sm ${
                  active ? "bg-elevated text-fg" : "text-muted hover:text-fg"
                }`}
              >
                <Icon className="size-5 text-accent" strokeWidth={1.7} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
    </div>
  );
}
