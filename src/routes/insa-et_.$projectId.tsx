import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AppGate } from "@/components/gate";
import { BuilderPreview } from "@/components/builder-preview";
import { Button } from "@/components/ui/button";
import { ScreenLoader } from "@/components/screen-loader";
import {
  applyBuilderEdit,
  attachStudioImageToBuilder,
  cancelBuilderJob,
  copyBuilderProject,
  deleteBuilderProject,
  exportBuilderProject,
  listBuilderAssets,
  progressBuilderJob,
  publishBuilderProject,
  renameBuilderProject,
  restoreBuilderVersion,
  retestBuilderProject,
  retryBuilderJob,
  saveBuilderFile,
  saveBuilderProject,
  updateBuilderQueueItem,
  uploadBuilderAsset,
  type BuilderAsset,
  type BuilderProject,
} from "@/lib/zunoza/builder";
import { nextPollDelay } from "@/lib/zunoza/perf";
import { friendlyClientError } from "@/lib/zunoza/client-error";
import { getCreditCatalog } from "@/lib/zunoza/credits";
import { builderCreditHint, readCatalogCost } from "@/lib/zunoza/builder-credit";
import { DEFAULT_FEATURE_CREDITS } from "@/lib/zunoza/credit-economy";
import { downloadZip } from "@/lib/zunoza/builder-zip";
import { BUILDER_JOB_DEADLINE_MS } from "@/lib/zunoza/builder-agent";
import { displaySafeText } from "@/lib/zunoza/builder-sanitize";
import { formatBuilderIssuesLine } from "@/lib/zunoza/builder-files";
import { mergeBuilderStream, builderPreviewUnlocked, type BuilderStreamItem } from "@/lib/zunoza/builder-stream";
import {
  builderJobTimeoutCopy,
  builderThinkLine,
  builderThinkProgress,
  builderThinkStallCopy,
  builderThinkStalled,
  formatRunClock,
  groupBuilderFlow,
  workLineKind,
} from "@/lib/zunoza/builder-flow-ui";
import { applyUserScrollIntent, isFlowAtBottom, shouldAutoFollowFlow } from "@/lib/zunoza/builder-scroll";
import { builderTaskLabel, canMutateQueuedTask } from "@/lib/zunoza/builder-queue";
import { formatSelectedEdit, type BuilderPick } from "@/lib/zunoza/builder-select";
import { dictationSupported, startDictation } from "@/lib/zunoza/speech-input";
import { ArrowUp, Mic, Plus } from "lucide-react";

function isNetworkFail(err: unknown) {
  const msg = err instanceof Error ? err.message : String(err || "");
  return /load failed|failed to fetch|networkerror|aborted|timeout/i.test(msg);
}

export const Route = createFileRoute("/insa-et_/$projectId")({ component: Page });

function Page() {
  return (
    <AppGate>
      <Workspace />
    </AppGate>
  );
}

function Workspace() {
  const { projectId } = Route.useParams();
  const nav = useNavigate();
  const [project, setProject] = useState<BuilderProject | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [drawerPane, setDrawerPane] = useState<"home" | "edit" | "url" | "secrets" | "links" | "settings">("home");
  const [rename, setRename] = useState("");
  const [history, setHistory] = useState(false);
  const [cycle, setCycle] = useState(0);
  const [assets, setAssets] = useState<BuilderAsset[]>([]);
  const [editCost, setEditCost] = useState(DEFAULT_FEATURE_CREDITS.builder_edit);
  const [repairCost, setRepairCost] = useState(DEFAULT_FEATURE_CREDITS.builder_repair);
  const [balance, setBalance] = useState<number | null>(null);
  const [unlimited, setUnlimited] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [savedNote, setSavedNote] = useState<string | null>(null);
  const [file, setFile] = useState("index.html");
  const [draft, setDraft] = useState("");
  const [dirty, setDirty] = useState(false);
  const [liveOpen, setLiveOpen] = useState(false);
  const [liveDevice, setLiveDevice] = useState<"desktop" | "tablet" | "phone">("desktop");
  const [studio, setStudio] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const [shareNote, setShareNote] = useState<string | null>(null);
  const [stream, setStream] = useState<BuilderStreamItem[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const stickRef = useRef(true);
  const userScrollRef = useRef(false);
  const programmaticRef = useRef(false);
  const userScrollTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const sendChain = useRef(Promise.resolve());
  const [away, setAway] = useState(false);
  const flowRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const composer = useRef<HTMLTextAreaElement>(null);
  const sendingRef = useRef(false);
  const previewShown = useRef(false);
  const filePick = useRef<HTMLInputElement>(null);
  const stopTalk = useRef<(() => void) | null>(null);
  const [listening, setListening] = useState(false);
  const [opsOpen, setOpsOpen] = useState(false);
  con
... 