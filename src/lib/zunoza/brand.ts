import { looksLikeMemoryCommand } from "./memory-intent.ts";

/** Kamuya açık, doğrulanmış kurucu profili. Özel hayat bilgisi yok. */
export type FounderProfile = {
  name: string;
  origin: string;
  company: string;
  vision: string;
  bio: string;
};

export const DEFAULT_FOUNDER_PROFILE: FounderProfile = {
  name: "Hasan Öcal",
  origin: "Kırıkkale",
  company: "Öz Öcal Tespihçilik",
  vision: "Yapay zekâ teknolojilerini herkes için erişilebilir kılmak.",
  bio: "Hasan Öcal, Kırıkkaleli iş insanı ve girişimcidir. ZUNOZA Teknoloji’nin ve ZUNOZA çatısı altında geliştirilen dijital projelerin kurucusu ve yöneticisidir. Aynı zamanda uzun yıllardır faaliyet gösteren Öz Öcal Tespihçilik’in kurucusu ve yöneticisidir. Geleneksel ticarette edindiği tecrübeyi teknoloji ve dijital girişimciliğe taşımış; yapay zeka, dijital içerik üretimi, mobil uygulamalar ve yeni nesil internet teknolojileri üzerine projeler geliştirmektedir. ZUNOZA’yı yapay zeka teknolojilerini herkes için erişilebilir kılma vizyonuyla kurmuştur.",
};

export const BRAND = {
  founderName: DEFAULT_FOUNDER_PROFILE.name,
  founderOrigin: "Kırıkkaleli",
  founderBio: DEFAULT_FOUNDER_PROFILE.bio,
  founderCompany: DEFAULT_FOUNDER_PROFILE.company,
} as const;

export function parseFounderProfile(raw: unknown): FounderProfile {
  let src: Record<string, unknown> = {};
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (parsed && typeof parsed === "object") src = parsed as Record<string, unknown>;
    } catch {
      if (raw.trim().length >= 40) return { ...DEFAULT_FOUNDER_PROFILE, bio: raw.trim().slice(0, 4000) };
    }
  } else if (raw && typeof raw === "object") {
    src = raw as Record<string, unknown>;
  }
  const text = (key: keyof FounderProfile, fallback: string, max: number) => {
    const value = String(src[key] ?? "").replace(/\s+/g, " ").trim();
    return value.length >= 2 ? value.slice(0, max) : fallback;
  };
  return {
    name: text("name", DEFAULT_FOUNDER_PROFILE.name, 80),
    origin: text("origin", DEFAULT_FOUNDER_PROFILE.origin, 80),
    company: text("company", DEFAULT_FOUNDER_PROFILE.company, 120),
    vision: text("vision", DEFAULT_FOUNDER_PROFILE.vision, 400),
    bio: text("bio", DEFAULT_FOUNDER_PROFILE.bio, 4000),
  };
}

export function founderProfileSystem(profile: FounderProfile = DEFAULT_FOUNDER_PROFILE) {
  return `DOĞRULANMIŞ KURUCU PROFİLİ (kamuya açık profesyonel bilgi; kullanıcı hafızası değil; özel hayat yok):
Ad: ${profile.name}
Köken: ${profile.origin}
Geleneksel işletme: ${profile.company} (kurucusu ve yöneticisi)
Vizyon: ${profile.vision}
Profil: ${profile.bio}

Kurucu / ${profile.name} sorularında tek cümlelik kısa yanıt VERME. Yalnızca bu profili kullan. Uydurma özel bilgi (aile, adres, telefon, gelir, sağlık) ekleme. Sorunun kapsamına göre doğal, kapsamlı ve profesyonel cevap ver. Kullanıcıya “sen ${profile.name}’sın” deme; kullanıcı kimliği yalnızca kayıtlı notlarından gelir. Bu kural sohbet kısalığından üstündür.`;
}

function fold(text: string) {
  return text.toLocaleLowerCase("tr-TR").replace(/[?!.,;:]+/g, " ").replace(/\s+/g, " ").trim();
}

function aboutHasan(n: string) {
  return n.includes("hasan öcal") || n.includes("hasan ocal");
}

function aboutZunoza(n: string) {
  return n.includes("zunoza") || n.includes("seni") || /\bsen\b/.test(n) || n.includes("you");
}

export function isFounderQuestion(text: string) {
  const raw = text.trim();
  if (raw.length < 4) return false;
  if (looksLikeMemoryCommand(raw)) return false;
  const n = fold(raw);
  if (/^(ben kimim|adım ne|adim ne|benim adım|benim adim)/.test(n)) return false;
  if (aboutHasan(n)) {
    const topic =
      n.includes("kimdir") ||
      n.includes("nedir") ||
      n.includes("hakkında") ||
      n.includes("hakkinda") ||
      n.includes("nereli") ||
      n.includes("nereden") ||
      n.includes("kurucu") ||
      n.includes("sahibi") ||
      n.includes("vizyon") ||
      n.includes("tespih") ||
      n.includes("tesbih") ||
      n.includes("şirket") ||
      n.includes("sirket") ||
      n.includes("işletme") ||
      n.includes("girişim") ||
      n.includes("girisim") ||
      n.includes("ne iş") ||
      n.includes("ne is") ||
      n.includes("ne yapar") ||
      n.includes("who is") ||
      n.includes("founder") ||
      n.endsWith(" kim") ||
      n.includes(" kim ");
    if (topic) return true;
    if (n.length <= 24) return true;
    return false;
  }
  const asksFounder =
    /kim\s+(üretti|uretti|yapti|yaptı|oluştur|olustur|yaratt|kurdu)/.test(n) ||
    n.includes("kurucusu kim") ||
    n.includes("kurucun") ||
    n.includes("sahibi kim") ||
    n.includes("kim kurdu") ||
    n.includes("kim yaptı") ||
    n.includes("kim yapti") ||
   
... 