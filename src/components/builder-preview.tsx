import { useEffect, useRef } from "react";
import { BUILDER_PREVIEW_CSP } from "@/lib/zunoza/builder-sanitize";
import { type BuilderFileMap } from "@/lib/zunoza/builder-files";
import { buildPreviewDocument, previewDocumentReady } from "@/lib/zunoza/builder-quality";
import { injectBuilderSelectScript, parseBuilderSelectMessage, type BuilderPick } from "@/lib/zunoza/builder-select";

export function livePreviewHtml(html: string | null | undefined, files?: BuilderFileMap | null) {
  const map = files && Object.keys(files).length ? files : html ? { "index.html": html } : {};
  const built = buildPreviewDocument(map, html || "");
  if (built.html && previewDocumentReady(built.html)) return built.html;
  if (built.html) return built.html;
  return html || "";
}

export function BuilderPreview({
  html,
  files,
  device,
  chrome = true,
  pick = false,
  onPick,
}: {
  html: string | null;
  files?: BuilderFileMap | null;
  device: "desktop" | "tablet" | "phone" | "full";
  busy?: boolean;
  chrome?: boolean;
  pick?: boolean;
  onPick?: (hit: BuilderPick) => void;
}) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const doc = livePreviewHtml(html, files);
  const sourced = pick ? injectBuilderSelectScript(doc) : doc;
  const frameKey = sourced
    ? `${sourced.length}:${sourced.slice(0, 48)}:${sourced.slice(Math.floor(sourced.length / 2), Math.floor(sourced.length / 2) + 24)}:${sourced.slice(-48)}:${pick ? "pick" : "view"}`
    : "empty";

  useEffect(() => {
    if (!pick || !onPick) return;
    function onMsg(ev: MessageEvent) {
      if (frameRef.current && ev.source && ev.source !== frameRef.current.contentWindow) return;
      const hit = parseBuilderSelectMessage(ev.data);
      if (hit) onPick(hit);
    }
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [pick, onPick]);

  if (!sourced) {
    return (
      <div className="grid min-h-64 place-items-center znz-panel px-4 text-center text-sm text-muted">
        Önizleme hazır olduğunda burada görünecek.
      </div>
    );
  }
  return (
    <div className={`builder-frame is-${device} ${chrome ? "" : "is-bare"}`}>
      {chrome ? (
        <div className="builder-bezel" aria-hidden>
          <span />
        </div>
      ) : null}
      <iframe
        ref={frameRef}
        key={frameKey}
        title="Uygulama önizlemesi"
        className="builder-iframe"
        sandbox="allow-scripts"
        referrerPolicy="no-referrer"
        allow=""
        {...{ csp: BUILDER_PREVIEW_CSP }}
        srcDoc={sourced}
      />
    </div>
  );
}