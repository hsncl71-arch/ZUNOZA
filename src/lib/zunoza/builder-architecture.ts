import type { BuilderFileMap } from "./builder-files.ts";

export type BuilderPlan = {
  name?: string;
  description?: string;
  pages?: string[];
  files?: string[];
  features?: string[];
  kind?: string;
  auth?: string;
  payments?: string;
  needs?: string[];
};

export function inferAppKind(prompt: string, plan?: BuilderPlan | null) {
  if (plan?.kind?.trim()) return plan.kind.trim().slice(0, 40);
  const p = prompt.toLocaleLowerCase("tr-TR");
  if (/e-?ticaret|mağaza|magaza|sepet|ürün|urun|kuyumcu|mücevher|mucevher|takı|taki|jewelry/.test(p)) return "e-ticaret";
  if (/restoran|rezerv|randevu|lokanta/.test(p)) return "rezervasyon";
  if (/dashboard|admin|yönetim|yonetim|crm|saas/.test(p)) return "panel";
  if (/yap[ıi]lacak|to-?do|görev list|checklist/.test(p)) return "todo";
  if (/landing|tanıtım|tanitim|kurumsal|şirket|sirket|ajans|firma sitesi/.test(p)) return "landing";
  if (/kurs|ders|eğitim|egitim|öğrenci|ogrenci/.test(p)) return "eğitim";
  if (/fatura|muhasebe|finans|bütçe|butce|gelir/.test(p)) return "finans";
  if (/sağlık|saglik|fitness|spor|beslenme/.test(p)) return "sağlık";
  if (/mesaj|sohbet|sosyal/.test(p)) return "sosyal";
  if (/blog|içerik|icerik|haber|portföy|portfoy/.test(p)) return "içerik";
  if (/oyun/.test(p)) return "oyun";
  return "web uygulaması";
}

export function defaultPagesForKind(kind: string, prompt = ""): string[] {
  if (kind === "e-ticaret") {
    return ["Vitrin", "Kategoriler", "Ürünler", "Ürün", "Favoriler", "Sepet", "Giriş", "Hesabım", "İletişim"];
  }
  if (kind === "rezervasyon") return ["Ana sayfa", "Menü", "Rezervasyon", "Hakkımızda", "İletişim"];
  if (kind === "panel") return ["Panel", "Kayıtlar", "Profil", "Ayarlar"];
  if (kind === "sosyal") return ["Akış", "Mesajlar", "Bildirimler", "Profil"];
  if (kind === "içerik") return ["Yazılar", "Hakkında", "Arşiv", "İletişim"];
  if (kind === "oyun") return ["Oyna", "Skorlar", "Nasıl", "Ayar"];
  if (kind === "todo") return ["Liste", "Bugün", "Arşiv", "Ayarlar"];
  if (kind === "landing") {
    if (/şirket|sirket|kurumsal|ajans/.test(prompt)) {
      return ["Ana sayfa", "Hizmetler", "Hakkımızda", "İletişim"];
    }
    return ["Giriş", "Özellikler", "Fiyat", "İletişim"];
  }
  if (kind === "eğitim") return ["Kurslar", "Ders", "Ödev", "Profil"];
  if (kind === "finans") return ["Özet", "Hareketler", "Faturalar", "Ayarlar"];
  if (kind === "sağlık") return ["Günlük", "Program", "Ölçüm", "Profil"];
  return ["Ana sayfa", "Özellikler", "Hakkında", "İletişim"];
}

const PAGE_HINTS: Array<{ re: RegExp; label: string }> = [
  { re: /kategor/i, label: "Kategoriler" },
  { re: /ürün detay|urun detay/i, label: "Ürün" },
  { re: /ürün list|urun list|ürünler|urunler/i, label: "Ürünler" },
  { re: /favori/i, label: "Favoriler" },
  { re: /sepet/i, label: "Sepet" },
  { re: /giri[şs]|kay[ıi]t|üyelik|uyelik/i, label: "Giriş" },
  { re: /profil|hesab/i, label: "Hesabım" },
  { re: /ileti[şs]im/i, label: "İletişim" },
  { re: /menü|menu/i, label: "Menü" },
  { re: /rezerv/i, label: "Rezervasyon" },
  { re: /hakk[ıi]m[ıi]zda|hakkında|hakkimda/i, label: "Hakkımızda" },
  { re: /projeler/i, label: "Projeler" },
  { re: /ana\s*sayfa|vitrin/i, label: "Ana sayfa" },
];

function normLabel(value: string) {
  return String(value || "")
    .toLocaleLowerCase("tr-TR")
    .replace(/\s+/g, " ")
    .trim();
}

export function pagesFromPrompt(prompt: string): string[] {
  const found: string[] = [];
  for (const hint of PAGE_HINTS) {
    if (hint.re.test(prompt) && !found.some((x) => normLabel(x) === normLabel(hint.label))) {
      found.push(hint.label);
    }
  }
  return found.slice(0, 12);
}

function mergePageLabels(kind: string, prompt: string, planPages: string[]) {
  const base = planPages.length >= 4 ? planPages : defaultPagesForKind(kind, prompt);
  const extras = pagesFromPrompt(prompt);
  const merged: string[] = [];
  for (const label of [...base, ...extras]) {
    const n = normLabel(label);
    if (!n) continue;
    if (merged.some((x) => normLabel(x) === n)) continue;
    merged.push(label);
  }
  return merged.slice(0, 12);
}

export function completeBuilderPlan(prompt: string, plan?: BuilderPlan | null): BuilderPlan {
  const kind = inferAppKind(prompt, plan);
  co
... 