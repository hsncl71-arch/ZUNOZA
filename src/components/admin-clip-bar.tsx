import { useRef, useState } from "react";
import { getBearerToken } from "@/lib/auth/client";
import { deleteShowcaseClip, reorderShowcaseClips, updateShowcaseTitle } from "@/lib/zunoza/showcase-api";
import { postShowcaseVideo, SHOWCASE_VIDEO_ACCEPT } from "@/lib/zunoza/showcase-upload";
import type { ShowcaseLane } from "@/lib/zunoza/showcase";

export function AdminClipBar({
  lane,
  clipId,
  title,
  onChanged,
}: {
  lane: ShowcaseLane;
  clipId?: string;
  title?: string;
  onChanged: (info?: { deletedId?: string }) => void;
}) {
  const replaceRef = useRef<HTMLInputElement>(null);
  const createRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [draftTitle, setDraftTitle] = useState(title || "");

  async function run(label: string, work: () => Promise<{ deletedId?: string } | void>) {
    if (busy) return;
    setErr(null);
    setBusy(label);
    try {
      const result = await work();
      onChanged(result || undefined);
    } catch (error) {
      setErr(error instanceof Error ? error.message : "İşlem başarısız.");
    } finally {
      setBusy(null);
    }
  }

  function pick(input: HTMLInputElement | null) {
    if (busy) return;
    setErr(null);
    if (input) {
      input.value = "";
      input.click();
    }
  }

  function onFile(action: "replace" | "create", file: File | undefined) {
    if (!file) return;
    void run(action === "replace" ? "Değiştiriliyor…" : "Yükleniyor…", async () => {
      await postShowcaseVideo({
        file,
        lane,
        action,
        clipId: action === "replace" ? clipId : undefined,
        afterId: action === "create" ? clipId : undefined,
        token: getBearerToken(),
        onProgress: (pct) => setBusy(`Yükleniyor… ${pct}%`),
      });
    });
  }

  return (
    <div className="admin-clip-bar" onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
      <input
        ref={replaceRef}
        className="sr-only"
        type="file"
        accept={SHOWCASE_VIDEO_ACCEPT}
        disabled={!clipId || Boolean(busy)}
        onChange={(e) => onFile("replace", e.target.files?.[0])}
      />
      <input
        ref={createRef}
        className="sr-only"
        type="file"
        accept={SHOWCASE_VIDEO_ACCEPT}
        disabled={Boolean(busy)}
        onChange={(e) => onFile("create", e.target.files?.[0])}
      />
      {clipId ? (
        <button type="button" disabled={Boolean(busy)} onClick={() => pick(replaceRef.current)}>
          Video Değiştir
        </button>
      ) : null}
      <button type="button" disabled={Boolean(busy)} onClick={() => pick(createRef.current)}>
        Yeni Video Yükle
      </button>
      {clipId ? (
        <button
          type="button"
          disabled={Boolean(busy)}
          onClick={() =>
            void run("Siliniyor…", async () => {
              await deleteShowcaseClip({ data: { id: clipId, lane } });
              return { deletedId: clipId };
            })
          }
        >
          Sil
        </button>
      ) : null}
      {clipId ? (
        editingTitle ? (
          <form
            className="admin-clip-title"
            onSubmit={(e) => {
              e.preventDefault();
              void run("Kaydediliyor…", async () => {
                await updateShowcaseTitle({ data: { id: clipId, title: draftTitle } });
                setEditingTitle(false);
              });
            }}
          >
            <input
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              placeholder="Kart başlığı"
              maxLength={80}
              aria-label="Kart başlığı"
              disabled={Boolean(busy)}
            />
            <button type="submit" disabled={Boolean(busy) || draftTitle.trim().length < 2}>
              Kaydet
            </button>
            <button type="button" disabled={Boolean(busy)} onClick={() => setEditingTitle(false)}>
              Vazgeç
            </button>
          </form>
        ) : (
          <button
            type="button"
            disabled={Boolean(busy)}
            onClick={() => {
              setDraftTitle(title || "");
              setEditingTitle(true);
            }}
          >
            Başlık Ekle/Düzenle
          </button>
        )
      ) : null}
      {clipId ? (
        <span className="admin-clip-order">
          <em>Sıralamayı Değiştir</em>
          <button
            type="button"
            aria-label="Öne al"
            disabled={Boolean(busy)}
            onClick={() =>
              void run("Sıralanıyor…", async () => {
                await reorderShowcaseClips({ data: { lane, id: clipId, dir: -1 } });
              })
            }
          >
            ◀
          </button>
          <button
            type="
... 