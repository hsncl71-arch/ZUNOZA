export function JobProgress({
  stages,
  current,
  hint,
  elapsed,
  pct,
}: {
  stages: string[];
  current: number;
  hint: string;
  elapsed?: string;
  pct?: number | null;
}) {
  const total = Math.max(1, stages.length);
  const idx = Math.max(0, Math.min(current, total - 1));
  const showPct = typeof pct === "number" && Number.isFinite(pct);
  return (
    <div className="znz-panel space-y-2 p-4" data-job-progress="1">
      <p className="text-sm text-fg">{hint}</p>
      <div className="flex flex-wrap gap-2">
        {stages.map((label, i) => (
          <span
            key={label}
            className={`rounded-full px-2.5 py-1 text-[11px] ${
              i < idx ? "bg-ok/20 text-ok" : i === idx ? "bg-accent/20 text-accent" : "bg-elevated text-muted"
            }`}
          >
            {i < idx ? "✓ " : i === idx ? "● " : "○ "}
            {label}
          </span>
        ))}
      </div>
      <p className="text-xs text-muted">
        Aşama {idx + 1}/{total}
        {elapsed ? ` · ${elapsed}` : ""}
        {showPct ? ` · ${Math.round(pct)}%` : ""}
      </p>
    </div>
  );
}