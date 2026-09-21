import { useEffect, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { useStickyUser } from "@/components/gate";
import { useBootstrap } from "@/components/bootstrap";
import { ZunozaHeroGlyph } from "@/components/logo";
import {
  isWelcomeExemptPath,
  resetWelcomeScreen,
  shouldShowWelcome,
  stampWelcomeSeen,
  WELCOME_RESET_EVENT,
} from "@/lib/zunoza/welcome";

export function WelcomeScreen() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user } = useStickyUser();
  const { data, refresh } = useBootstrap();
  const [dismissed, setDismissed] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const onReset = () => {
      setDismissed(false);
      setLeaving(false);
      refresh();
    };
    window.addEventListener(WELCOME_RESET_EVENT, onReset);
    return () => window.removeEventListener(WELCOME_RESET_EVENT, onReset);
  }, [refresh]);

  const visible = shouldShowWelcome({
    signedIn: Boolean(user),
    pending: Boolean(data?.welcomePending),
    dismissed,
    pathname,
  });

  if (!visible && !leaving) return null;
  if (isWelcomeExemptPath(pathname)) return null;

  function finish() {
    setDismissed(true);
    setLeaving(false);
    void stampWelcomeSeen()
      .then(() => refresh())
      .catch(() => undefined);
  }

  function start() {
    if (leaving) return;
    setLeaving(true);
    window.setTimeout(finish, 420);
  }

  return (
    <div className={`welcome-screen ${leaving ? "is-leaving" : ""}`} role="dialog" aria-label="ZUNOZA karşılama">
      <div className="welcome-wash" aria-hidden />
      <div className="welcome-orb welcome-orb-a" aria-hidden />
      <div className="welcome-orb welcome-orb-b" aria-hidden />
      <div className="welcome-body">
        <div className="welcome-brand">
          <ZunozaHeroGlyph className="welcome-glyph" />
          <p className="welcome-word">ZUNOZA AI VIDEO</p>
        </div>
        <div className="welcome-copy">
          <h1>Hoş Geldiniz</h1>
          <p>Hayal edin, oluşturun, keşfedin.</p>
        </div>
        <button type="button" className="welcome-cta" onClick={start}>
          Başlayalım
          <ArrowRight className="size-5" strokeWidth={2.4} />
        </button>
      </div>
    </div>
  );
}

export async function replayWelcomeScreen() {
  await resetWelcomeScreen();
  window.dispatchEvent(new Event(WELCOME_RESET_EVENT));
}
