import { useId } from "react";

export function ZunozaGlyph({ className = "h-9 w-9" }: { className?: string }) {
  const raw = useId().replace(/:/g, "");
  const glow = `zg-${raw}`;
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <defs>
        <radialGradient id={glow} cx="50%" cy="40%" r="62%">
          <stop offset="0%" stopColor="#c9c0ff" />
          <stop offset="38%" stopColor="#6b74ff" />
          <stop offset="78%" stopColor="#2a3dff" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#05050a" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="#05050a" />
      <ellipse cx="32" cy="28" rx="26" ry="24" fill={`url(#${glow})`} />
      <path
        d="M16 16h32v8.5L28.5 39.5H48V48H16v-8.5L35.5 24.5H16V16Z"
        fill="#f4f2ff"
      />
    </svg>
  );
}

export function ZunozaHeroGlyph({ className = "h-36 w-36" }: { className?: string }) {
  const raw = useId().replace(/:/g, "");
  const planet = `zhp-${raw}`;
  const rim = `zhr-${raw}`;
  const shine = `zhs-${raw}`;
  return (
    <svg viewBox="0 0 160 160" className={className} aria-hidden="true">
      <defs>
        <radialGradient id={planet} cx="48%" cy="42%" r="58%">
          <stop offset="0%" stopColor="#d8d4ff" stopOpacity="0.55" />
          <stop offset="32%" stopColor="#6b8cff" stopOpacity="0.42" />
          <stop offset="68%" stopColor="#2a3dff" stopOpacity="0.16" />
          <stop offset="100%" stopColor="#05050a" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={rim} x1="18%" y1="8%" x2="86%" y2="92%">
          <stop offset="0%" stopColor="#9be8ff" />
          <stop offset="45%" stopColor="#7b82ff" />
          <stop offset="100%" stopColor="#9b6bff" />
        </linearGradient>
        <linearGradient id={shine} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f7f4ff" />
          <stop offset="55%" stopColor="#cfd6ff" />
          <stop offset="100%" stopColor="#8aa0ff" />
        </linearGradient>
      </defs>
      <ellipse cx="80" cy="74" rx="62" ry="58" fill={`url(#${planet})`} />
      <ellipse
        cx="80"
        cy="74"
        rx="58"
        ry="54"
        fill="none"
        stroke={`url(#${rim})`}
        strokeWidth="2.4"
        opacity="0.85"
      />
      <path
        d="M44 44h72v18L73 90h43v18H44V90l43-28H44V44Z"
        fill={`url(#${shine})`}
      />
    </svg>
  );
}

export function ZunozaWordmark() {
  return (
    <span className="flex min-w-0 items-baseline gap-1.5">
      <span className="truncate font-sans text-sm font-semibold tracking-[0.14em]">ZUNOZA</span>
      <span className="shrink-0 text-[10px] font-medium tracking-[0.16em] text-accent uppercase">AI Video</span>
    </span>
  );
}

export function ZunozaMark({ className = "h-9" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <ZunozaGlyph className="h-full w-auto" />
      <span className="flex flex-col leading-none">
        <span className="font-sans text-[1.05rem] font-semibold tracking-[0.18em] text-fg">
          ZUNOZA
        </span>
        <span className="text-[0.62rem] font-medium tracking-[0.22em] text-accent uppercase">
          AI Video
        </span>
      </span>
    </span>
  );
}

export function ZunozaCover({ className = "" }: { className?: string }) {
  return (
    <img
      src="/brand-cover.jpg"
      alt="ZUNOZA AI VIDEO"
      className={`w-full rounded-2xl border border-border object-cover ${className}`}
    />
  );
}
