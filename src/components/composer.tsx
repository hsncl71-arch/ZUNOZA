import { type FormEvent, useEffect, useRef, useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { ArrowUp, Camera, Image as ImageIcon, Mic, Paperclip, Video, X } from "lucide-react";
import {
  ASK_EVENT,
  buildAskContent,
  requestLiveStart,
  stashPendingAsk,
  type ComposerAskDetail,
} from "@/lib/zunoza/composer-events";
import {
  compressAskImage,
  sampleVideoFrames,
  transcribeVideoIfSmall,
  videoAskCaption,
} from "@/lib/zunoza/ask-media-client";

type Attach = {
  id: string;
  kind: "image" | "video";
  name: string;
  preview?: string;
  dataUrl?: string;
  file?: File;
};

function readFile(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Dosya okunamadı."));
    reader.readAsDataURL(file);
  });
}

async function compressImage(file: File) {
  try {
    return await compressAskImage(file, 1152, 0.74);
  } catch (err) {
    if (/HEIC|HEIF|bu tarayıcıda/i.test(String(err instanceof Error ? err.message : err))) throw err;
  }
  const raw = await readFile(file);
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Görsel okunamadı."));
    img.src = raw;
  });
  const max = 1152;
  const scale = Math.min(1, max / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(img.width * scale));
  canvas.height = Math.max(1, Math.round(img.height * scale));
  canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.74);
}

function isImageFile(file: File) {
  const type = (file.type || "").toLowerCase();
  const name = file.name.toLowerCase();
  return type.startsWith("image/") || /\.(jpe?g|png|webp|hei[cf])$/i.test(name);
}

function isVideoFile(file: File) {
  const type = (file.type || "").toLowerCase();
  const name = file.name.toLowerCase();
  return type.startsWith("video/") || /\.(mp4|mov|m4v|webm)$/i.test(name);
}

export function Composer() {
  const nav = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [idea, setIdea] = useState("");
  const [files, setFiles] = useState<Attach[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const photoRef = useRef<HTMLInputElement | null>(null);
  const cameraRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLInputElement | null>(null);
  const sendingRef = useRef(false);
  const onAsistan = pathname === "/asistan";

  useEffect(() => {
    function applyKeyboard() {
      const vv = window.visualViewport;
      if (!vv) {
        document.documentElement.style.setProperty("--kb", "0px");
        return;
      }
      const inset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      document.documentElement.style.setProperty("--kb", `${Math.round(inset)}px`);
    }
    applyKeyboard();
    window.visualViewport?.addEventListener("resize", applyKeyboard);
    window.visualViewport?.addEventListener("scroll", applyKeyboard);
    window.addEventListener("resize", applyKeyboard);
    return () => {
      window.visualViewport?.removeEventListener("resize", applyKeyboard);
      window.visualViewport?.removeEventListener("scroll", applyKeyboard);
      window.removeEventListener("resize", applyKeyboard);
      document.documentElement.style.removeProperty("--kb");
    };
  }, []);

  async function addFiles(list: FileList | null) {
    if (!list?.length) return;
    setError(null);
    setMenuOpen(false);
    for (const file of [...list].slice(0, 4)) {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      if (isVideoFile(file)) {
        if (file.size > 80_000_000) {
          setError("Video 80 MB’dan küçük olmalı.");
          continue;
        }
        setFiles((prev) => (prev.length >= 4 ? prev : [...prev, { id, kind: "video", name: file.name, file }]));
        continue;
      }
      if (!isImageFile(file)) {
        setError("JPEG, PNG, WEBP, HEIC veya MP4/MOV ekleyin.");
        continue;
      }
      if (file.size > 16_000_000) {
        setError("Fotoğraf 16 MB’dan küçük olmalı.");
        continue;
      }
      try {
        const dataUrl = await compressImage(file);
        setFiles((prev) =>
          prev.length >= 4 ? prev : [...prev, { id, kind: "image", name: file.name, preview: dataUrl, dataUrl }],
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Görsel eklenemedi.");
      }
    }
  }

  async function preparePayload() {
    const images: string[] = [];
    const videoNotes: string[] = [];
    for (const item of f
... 