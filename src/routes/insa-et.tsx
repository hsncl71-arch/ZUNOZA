import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Copy, Eye, FolderOpen, MoreHorizontal, Pencil, Plus, Mic, ArrowUp, Trash2 } from "lucide-react";
import { AppGate } from "@/components/gate";
import { Button } from "@/components/ui/button";
import { ScreenLoader } from "@/components/screen-loader";
import { BuilderPreview } from "@/components/builder-preview";
import {
  copyBuilderProject,
  deleteBuilderProject,
  getBuilderProject,
  listBuilderProjects,
  renameBuilderProject,
  startBuilderProject,
  type BuilderProject,
} from "@/lib/zunoza/builder";
import { getCreditCatalog } from "@/lib/zunoza/credits";
import { builderCreditHint, readCatalogCost } from "@/lib/zunoza/builder-credit";
import { friendlyClientError } from "@/lib/zunoza/client-error";
import { DEFAULT_FEATURE_CREDITS } from "@/lib/zunoza/credit-economy";
import { inferAppKind } from "@/lib/zunoza/builder-architecture";
import { dictationSupported, startDictation } from "@/lib/zunoza/speech-input";

export const Route = createFileRoute("/insa-et")({ component: Page });

const DELETE_CONFIRM =
  "Bu projeyi kalıcı olarak silmek istediğinize emin misiniz? Bu işlem geri alınamaz.";

function Page() {
  return (
    <AppGate>
      <Start />
    </AppGate>
  );
}

function statusLabel(status: string) {
  if (status === "hazir") return "Hazır";
  if (status === "hata") return "Hata";
  return "Hazırlanıyor";
}

function dayLabel(value: string) {
  const t = Date.parse(value);
  if (!Number.isFinite(t)) return "";
  return new Date(t).toLocaleString("tr-TR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function canPreview(p: { status: string; currentVersion: number }) {
  return p.status === "hazir" && p.currentVersion > 0;
}

function kindCover(kind: string) {
  if (kind === "e-ticaret") return "is-shop";
  if (kind === "rezervasyon") return "is-book";
  if (kind === "panel") return "is-panel";
  if (kind === "todo") return "is-todo";
  if (kind === "landing") return "is-land";
  if (kind === "eğitim") return "is-learn";
  if (kind === "finans") return "is-pay";
  if (kind === "sağlık") return "is-health";
  if (kind === "sosyal") return "is-social";
  if (kind === "içerik") return "is-content";
  if (kind === "oyun") return "is-play";
  return "is-app";
}

function Start() {
  const nav = useNavigate();
  const sendingRef = useRef(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const stopTalk = useRef<(() => void) | null>(null);
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createCost, setCreateCost] = useState(DEFAULT_FEATURE_CREDITS.builder_create);
  const [projects, setProjects] = useState<Awaited<ReturnType<typeof listBuilderProjects>> | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [unlimited, setUnlimited] = useState(false);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [copying, setCopying] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<BuilderProject | null>(null);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "tablet" | "phone">("desktop");
  const [shown, setShown] = useState(12);
  const [deskOpen, setDeskOpen] = useState(false);
  const [pendingName, setPendingName] = useState<string | null>(null);
  const [listening, setListening] = useState(false);

  useEffect(() => {
    listBuilderProjects()
      .then(setProjects)
      .catch(() => {
        setProjects([]);
        setError("Projeler yüklenemedi. Yenileyip tekrar deneyin.");
      });
    getCreditCatalog()
      .then((c) => {
     
... 