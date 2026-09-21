import { ZunozaGlyph } from "@/components/logo";

export function ScreenLoader({ label = "Yükleniyor" }: { label?: string }) {
  return (
    <div className="grid min-h-24 place-items-center px-6 py-8">
      <div className="flex flex-col items-center gap-3">
        <ZunozaGlyph className="z-loader h-10 w-10" />
        <p className="text-xs tracking-wide text-muted">{label}</p>
      </div>
    </div>
  );
}

export function FullScreenLoader({ label = "Yükleniyor" }: { label?: string }) {
  return (
    <div className="relative grid min-h-dvh place-items-center overflow-hidden bg-bg text-fg">
      <div className="aurora" aria-hidden />
      <div className="relative flex flex-col items-center gap-3">
        <ZunozaGlyph className="z-loader h-14 w-14" />
        <p className="text-xs tracking-wide text-muted">{label}</p>
      </div>
    </div>
  );
}
