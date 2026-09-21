import type { BuilderFileMap } from "./builder-files.ts";
import type { BuilderPlan } from "./builder-architecture.ts";
import { inferAppKind, pagesFromPrompt } from "./builder-architecture.ts";

export type AppKind =
  | "e-ticaret"
  | "rezervasyon"
  | "panel"
  | "sosyal"
  | "içerik"
  | "oyun"
  | "todo"
  | "landing"
  | "eğitim"
  | "finans"
  | "sağlık"
  | "web uygulaması";

type Skin = { bg: string; ink: string; paper: string; muted: string; line: string; accent: string; accentInk: string; font: string; radius: string };
type Page = { id: string; label: string };
type Seed = { title: string; meta: string; category?: string; img?: string };
type Recipe = { layout: "sidebar" | "top"; pages: Page[]; skin: Skin; seed: Seed[]; verb: string };

const SKINS: Record<string, Skin> = {
  "e-ticaret": { bg: "#f6efe6", ink: "#2a2118", paper: "#fffaf3", muted: "#7a6a58", line: "#e4d5c3", accent: "#c45c26", accentInk: "#fff7ed", font: '"Fraunces", Georgia, serif', radius: "18px" },
  rezervasyon: { bg: "#f4efe6", ink: "#241c16", paper: "#fffaf4", muted: "#6f6256", line: "#e2d3c4", accent: "#7a1f2b", accentInk: "#fff6f4", font: '"Cormorant Garamond", Georgia, serif', radius: "16px" },
  panel: { bg: "#f3f5f8", ink: "#15202b", paper: "#ffffff", muted: "#5b6b7c", line: "#d9e1ea", accent: "#0f766e", accentInk: "#f0fdfa", font: '"Source Sans 3", "Segoe UI", sans-serif', radius: "14px" },
  sosyal: { bg: "#fff7fb", ink: "#1b1220", paper: "#ffffff", muted: "#74657a", line: "#f0d7e6", accent: "#db2777", accentInk: "#fff0f6", font: '"IBM Plex Sans", sans-serif', radius: "20px" },
  içerik: { bg: "#f3ead8", ink: "#1f1810", paper: "#fff8ea", muted: "#6d6254", line: "#e4d3b5", accent: "#9a3412", accentInk: "#fff7ed", font: '"Iowan Old Style", Georgia, serif', radius: "12px" },
  oyun: { bg: "#070b10", ink: "#e8fff4", paper: "#101820", muted: "#9db3a8", line: "#1e2d28", accent: "#22c55e", accentInk: "#04210d", font: '"Space Grotesk", sans-serif', radius: "10px" },
  todo: { bg: "#fffcf5", ink: "#111827", paper: "#ffffff", muted: "#6b7280", line: "#ece4d4", accent: "#111827", accentInk: "#facc15", font: '"Segoe UI", sans-serif', radius: "12px" },
  landing: { bg: "#f8fafc", ink: "#0f172a", paper: "#ffffff", muted: "#64748b", line: "#e2e8f0", accent: "#0369a1", accentInk: "#f0f9ff", font: '"Manrope", "Segoe UI", sans-serif', radius: "22px" },
  eğitim: { bg: "#eef4fb", ink: "#132033", paper: "#ffffff", muted: "#5b6d82", line: "#d5e2f0", accent: "#1e3a5f", accentInk: "#eff6ff", font: '"Source Sans 3", sans-serif', radius: "16px" },
  finans: { bg: "#fbfaf6", ink: "#111827", paper: "#ffffff", muted: "#6b7280", line: "#ece7d8", accent: "#b45309", accentInk: "#fffbeb", font: '"Iowan Old Style", Georgia, serif', radius: "10px" },
  sağlık: { bg: "#f0fdf4", ink: "#14532d", paper: "#ffffff", muted: "#3f6b50", line: "#ccebd6", accent: "#047857", accentInk: "#ecfdf5", font: '"Manrope", sans-serif', radius: "18px" },
  "web uygulaması": { bg: "#f7f5f2", ink: "#1c1917", paper: "#fffcf8", muted: "#6b645c", line: "#e7e0d6", accent: "#3f6212", accentInk: "#f7fee7", font: '"Manrope", "Segoe UI", sans-serif', radius: "16px" },
};

export function skinForKind(kind: string, prompt = ""): Skin {
  const p = String(prompt || "").toLocaleLowerCase("tr-TR");
  if (/kuyumcu|mücevher|mucevher|takı|taki|jewelry|altın|elmas/.test(p)) {
    return {
      bg: "#0d0c0a",
      ink: "#f3e6c8",
      paper: "#171410",
      muted: "#b9a57a",
      line: "#3a3328",
      accent: "#c9a227",
      accentInk: "#1a1408",
      font: '"Cormorant Garamond", Georgia, serif',
      radius: "10px",
    };
  }
  return SKINS[kind] || SKINS["web uygulaması"];
}

function escapeText(value: string) {
  return String(value || "")
    .replace(/&/g, String.fromCharCode(38) + "amp;")
    .replace(/</g, String.fromCharCode(38) + "lt;")
    .replace(/>/g, String.fromCharCode(38) + "gt;")
    .replace(/"/g, String.fromCharCode(38) + "quot;");
}

function slugId(label: string) {
  return String(label || "sayfa")
    .toLocaleLowerCase("tr-TR")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 18) || "sayfa";
}

export function pageIdFromLabel(label: string, kind: string): string {
  const n = String(label || "").toLocaleLowerCase("tr-TR");
  if (/sepet|cart/.test(n)) return "sepet";
  if (/kategor/.test(n)) return "kategoriler";
  if (/^ürün$|^urun$|ürün detay|urun detay/.test(n)) return "urun";
  if (/ürün|urun/.test(n)) 
... 