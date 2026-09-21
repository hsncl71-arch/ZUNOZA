/** Homepage inspiration reel — recipes, not a copy of the sample file. */

import { clampXaiAspect, type VideoQuality } from "./video-request.ts";
import { clampStudioDuration, type VideoRetryPayload } from "./studio-handoff.ts";

export const SHOWCASE_BADGES = ["", "yeni", "trend", "populer", "izlenen", "one-cikan", "premium"] as const;
export type ShowcaseBadge = (typeof SHOWCASE_BADGES)[number];

export const SHOWCASE_BADGE_LABEL: Record<Exclude<ShowcaseBadge, "">, string> = {
  yeni: "Yeni",
  trend: "Trend",
  populer: "Popüler",
  izlenen: "En Çok İzlenen",
  "one-cikan": "Öne Çıkan",
  premium: "Premium",
};

export const SHOWCASE_LANES = ["ilham", "kesfet"] as const;
export type ShowcaseLane = (typeof SHOWCASE_LANES)[number];

export const DISCOVER_STUDIO_PATHS = [
  "/olustur",
  "/gorsel",
  "/kapak",
  "/muzik",
  "/seslendirme",
  "/storyboard",
  "/montaj",
  "/asistan",
] as const;
export type DiscoverStudioPath = (typeof DISCOVER_STUDIO_PATHS)[number];

export type ShowcaseClip = {
  id: string;
  title: string;
  category: string;
  badge: ShowcaseBadge;
  sortOrder: number;
  active: boolean;
  previewUrl: string;
  posterUrl: string;
  subject: string;
  scene: string;
  negativePrompt: string;
  style: string;
  camera: string;
  lighting: string;
  motion: string;
  durationSeconds: 5 | 10 | 15;
  aspect: string;
  quality: VideoQuality;
  model: string;
  seed: string;
  voiceMode: string;
  lane: ShowcaseLane;
  tag: string;
  studioPath: string;
  prompt: string;
  updatedAt?: number;
};

export const SHOWCASE_CATEGORIES = [
  "Vahşi yaşam",
  "Sinematik doğa",
  "Fantastik dünya",
  "Gelecek / şehir",
  "Lüks otomobil",
  "Ürün reklamı",
  "Sinematik portre",
  "Aksiyon",
  "Tarihî sahne",
  "Viral sosyal",
] as const;

function asIlham(
  clip: Omit<ShowcaseClip, "lane" | "tag" | "studioPath" | "prompt">,
): ShowcaseClip {
  return { ...clip, lane: "ilham", tag: "", studioPath: "/olustur", prompt: "" };
}

export const DEFAULT_SHOWCASE: ShowcaseClip[] = (
  [
  {
    id: "wildlife",
    title: "Bal peteği",
    category: "Vahşi yaşam",
    badge: "trend",
    sortOrder: 10,
    active: true,
    previewUrl: "/showcase/wildlife.mp4",
    posterUrl: "/showcase/wildlife.jpg",
    subject: "bal porsuğu",
    scene:
      "Ultra gerçekçi {subject} Afrika savanında alacakaranlıkta yabani bal peteğini parçalayıp yiyor, yapışkan bal damlıyor, toz parçacıkları havada asılı",
    negativePrompt: "yazı, logo, altyazı, çizgi film, deforme anatomi, bulanık yüz",
    style: "National Geographic belgesel gerçekçiliği, fotogerçekçi kürk ve doku",
    camera: "yavaş yaklaşan kamera, sürekli tek plan",
    lighting: "gün batımı hacimsel ışık, uzun gölgeler",
    motion: "doğal hayvan hareketi, orta yoğunluk, ağır çekim yok",
    durationSeconds: 10,
    aspect: "16:9",
    quality: "hd",
    model: "otomatik",
    seed: "",
    voiceMode: "ortam",
  },
  {
    id: "nature",
    title: "Kapadokya şafak",
    category: "Sinematik doğa",
    badge: "one-cikan",
    sortOrder: 20,
    active: true,
    previewUrl: "/showcase/nature.mp4",
    posterUrl: "/showcase/nature.jpg",
    subject: "Kapadokya peri bacaları ve sıcak hava balonları",
    scene: "Şafakta {subject} vadinin üzerindeki sisten yükseliyor",
    negativePrompt: "yazı, logo, kalabalık turist, modern araç",
    style: "anamorfik sinematik manzara, fotogerçekçi",
    camera: "yavaş drone vinç açılışı, ufuk kilitli",
    lighting: "altın saat, vadide yumuşak sis",
    motion: "yavaş, epik, tek sürekli hareket",
    durationSeconds: 10,
    aspect: "16:9",
    quality: "hd",
    model: "otomatik",
    seed: "",
    voiceMode: "ortam",
  },
  {
    id: "fantasy",
    title: "Kristal kale",
    category: "Fantastik dünya",
    badge: "yeni",
    sortOrder: 30,
    active: true,
    previewUrl: "/showcase/fantasy.mp4",
    posterUrl: "/showcase/fantasy.jpg",
    subject: "dev kadim ejderha",
    scene: "Fırtına bulutlarının üstünde yüzen kristal kalenin etrafında {subject} daire çiziyor",
    negativePrompt: "yazı, logo, düşük poligon, çocuk kitabı çizimi",
    style: "IMAX ölçekli fotogerçekçi fantastik sinema",
    camera: "etrafında dönen kamera, ufuk sabit",
    lighting: "hacimsel tanrı ışınları, fırtına arkasından kırılan güneş",
    motion: "geniş, ağır, görkemli kanat hareketi",
    durationSeconds: 10,
    aspect: "16:9",
    quality: "hd",
    model: "otomatik",
    seed: "",
    voiceMode: "ortam",
  },
  {
    id: "city",
    title: "Neon metropol",
    category: "Gelecek / şehir",
    badge: "populer",
    sortOrder: 40,
    active: true,
    previewUrl: "/showcase/city.mp4",
    posterUrl: "/showcase/city.jpg",
    subject: "yağmurlu gece megaşehir caddesi",
    scene: "{subject} üzerinde uçan araçlar ve holografik reklamlar, ıslak asfaltta yansımalar",
    negativePrompt: "yazı, okunabilir tabela metni, logo, gün
... 