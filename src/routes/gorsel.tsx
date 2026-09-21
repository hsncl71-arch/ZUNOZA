import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AppGate } from "@/components/gate";
import { Button } from "@/components/ui/button";
import { useBootstrap } from "@/components/bootstrap";
import {
  editStudioImage,
  generateStudioImage,
  listStudioImages,
  deleteStudioImage,
  type ImageAspect,
  type ImageAsset,
  type ImageResolution,
} from "@/lib/zunoza/images";
import { takeEditSource } from "@/lib/zunoza/image-edit";
import { getBearerToken } from "@/lib/auth/client";
import { getCreditCatalog } from "@/lib/zunoza/credits";
import { creditSpendCopy, PROMPT_KEYS, providerWaitCopy, takePromptText } from "@/lib/zunoza/studio-handoff";

export const Route = createFileRoute("/gorsel")({ component: Page });

const STYLES = ["Gerçekçi", "Sinematik", "Ürün", "İllüstrasyon", "Moda"];
const RATIOS: { id: ImageAspect; label: string }[] = [
  { id: "1:1", label: "1:1 — Kare" },
  { id: "9:16", label: "9:16 — Shorts" },
  { id: "16:9", label: "16:9 — YouTube" },
  { id: "4:3", label: "4:3" },
  { id: "3:4", label: "3:4" },
  { id: "3:2", label: "3:2" },
  { id: "2:3", label: "2:3" },
  { id: "21:9", label: "21:9 — Sinematik" },
  { id: "2:1", label: "2:1 — Banner" },
];
const LIGHTS = ["Doğal", "Altın saat", "Stüdyo", "Loş"];
const CAMERAS = ["Göz hizası", "Alçak açı", "Üstten", "Yakın plan"];
const MOODS = ["Sıcak", "Soğuk", "Nötr", "Kontrast"];
const COUNTS = [1, 2, 4] as const;

const STUDIO_IMAGE_KEY = "zunoza.studioImage";
const MAX_UPLOAD = 8_000_000;

function Chip({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`min-h-11 rounded-full px-3 text-sm ${selected ? "bg-accent text-accent-fg" : "bg-elevated"}`}
    >
      {children}
    </button>
  );
}

async function readImageFile(file: File): Promise<string> {
  const type = (file.type || "").toLowerCase();
  const name = file.name.toLowerCase();
  const okType =
    type.startsWith("image/jpeg") ||
    type === "image/png" ||
    type === "image/webp" ||
    type === "image/heic" ||
    type === "image/heif" ||
    type === "image/*" ||
    !type;
  if (!okType && !/\.(jpe?g|png|webp|heic|heif)$/i.test(name)) {
    throw new Error("JPEG, PNG, WEBP veya iPhone HEIC yükleyin.");
  }
  if (file.size > MAX_UPLOAD) throw new Error("Görsel 8 MB’dan küçük olmalı.");
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("Bu görsel okunamadı. HEIC ise Fotoğraflar’dan JPEG olarak dışa aktarın.");
  }
  const max = 1280;
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Görsel işlenemedi.");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.86);
}

function Page() {
  return (
    <AppGate>
      <ImageStudio />
    </AppGate>
  );
}

function ImageStudio() {
  const nav = useNavigate();
  const { data } = useBootstrap();
  const sendingRef = useRef(false);
  const [idea, setIdea] = useState("");
  const [style, setStyle] = useState(STYLES[0]!);
  const [ratio, setRatio] = useState<ImageAspect>("1:1");
  const [realism, setRealism] = useState(7);
  const [light, setLight] = useState(LIGHTS[0]!);
  const [camera, setCamera] = useState(CAMERAS[0]!);
  const [mood, setMood] = useState(MOODS[0]!);
  const [negative, setNegative] = useState("bulanık, yazı, filigran, deforme el");
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [references, setReferences] = useState<string[]>([]);
  const [count, setCount] = useState<(typeof COUNTS)[number]>(1);
  const [resolution, setResolution] = useState<ImageResolution>("1k");
  const [current, setCurrent] = useState<ImageAsset | null>(null);
  const [previews, setPreviews] = useState<ImageAsset[]>([]);
  const [library, setLibrary] = useState<ImageAsset[]>([]);
  const [libraryLoaded, setLibraryLoaded] = useState(false);
  const [libraryError, setLibraryError] = useState(false);
  const [error, setError] = useSt
... 