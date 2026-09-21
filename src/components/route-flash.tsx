import { useEffect, useRef, useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { ZunozaGlyph } from "@/components/logo";
import { NAV_FLASH_MS, pendingAppHref } from "@/lib/zunoza/nav-flash";

export function RouteFlash() {
  const router = useRouter();
  const [on, setOn] = useState(false);
  const busy = useRef(false);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (busy.current) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        return;
      }
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const el = event.target;
      if (!(el instanceof Element)) return;
      const anchor = el.closest("a");
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      const href = anchor.getAttribute("href");
      if (!href) return;
      const next = pendingAppHref(href, `${window.location.pathname}${window.location.search}`, window.location.origin);
      if (!next) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      busy.current = true;
      setOn(true);
      window.setTimeout(() => {
        router.history.push(next);
        setOn(false);
        busy.current = false;
      }, NAV_FLASH_MS);
    };
    window.addEventListener("click", onClick, true);
    return () => window.removeEventListener("click", onClick, true);
  }, [router]);

  if (!on) return null;
  return (
    <div className="route-flash" aria-hidden>
      <ZunozaGlyph className="route-flash-mark" />
    </div>
  );
}
