/** Written ZUNOZA’ya Sor reply language. No paid detector. */

export type AskLangTurn = { role: string; content: string };

const LANG_NAME: Record<string, string> = {
  tr: "Turkish (Türkçe)",
  en: "English",
  ar: "Arabic (العربية)",
  de: "German (Deutsch)",
  fr: "French (Français)",
  es: "Spanish (Español)",
  ru: "Russian (Русский)",
  zh: "Chinese (中文)",
  ja: "Japanese (日本語)",
  ko: "Korean (한국어)",
};

const AMBIG = new Set([
  "ok",
  "okay",
  "okey",
  "k",
  "hmm",
  "hm",
  "hı",
  "mhm",
  "lol",
  "lmao",
  "api",
  "yes",
  "yep",
  "no",
  "nope",
  "evet",
  "hayır",
  "hayir",
  "tamam",
  "tm",
  "kk",
]);

const EXPLICIT: { re: RegExp; id: string }[] = [
  { re: /\b(speak|talk|answer|reply|write|respond|speaking)\s+(in\s+)?english\b/i, id: "en" },
  { re: /\b(in english|english please)\b/i, id: "en" },
  { re: /\bingilizce\s+(konuş|konus|yaz|cevap|konuşm)/i, id: "en" },
  { re: /\b(speak|talk|answer|reply|write|speaking)\s+(in\s+)?turkish\b/i, id: "tr" },
  { re: /\b(in turkish|turkish please)\b/i, id: "tr" },
  { re: /\bt[üu]rk[cç]e\s+(konuş|konus|yaz|cevap)/i, id: "tr" },
  { re: /\b(speak|talk|answer|reply|write|speaking)\s+(in\s+)?arabic\b/i, id: "ar" },
  { re: /\b(in arabic|arabic please)\b/i, id: "ar" },
  { re: /\barap[cç]a\s+(konuş|konus|yaz|cevap)/i, id: "ar" },
  { re: /بالعربية|بالعربي|تحدث بالعربية|جاوب بالعربي/, id: "ar" },
];

function fold(text: string) {
  return String(text || "")
    .replace(/[?!.,;:]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function detectExplicitAskLanguage(text: string): string | null {
  const raw = String(text || "");
  for (const row of EXPLICIT) {
    if (row.re.test(raw)) return row.id;
  }
  return null;
}

export function isAmbiguousAskText(text: string): boolean {
  const n = fold(text);
  if (!n) return true;
  if (/^[\d\s+\-*/=.,:%#@]+$/.test(n)) return true;
  if (/^[^\p{L}\p{N}]+$/u.test(n)) return true;
  const tokens = n.toLocaleLowerCase("tr-TR").split(" ");
  if (tokens.length <= 3 && tokens.every((t) => AMBIG.has(t))) return true;
  return false;
}

function scriptLanguage(text: string): string | null {
  const ar = (text.match(/[\u0600-\u06FF]/g) || []).length;
  const cyr = (text.match(/[\u0400-\u04FF]/g) || []).length;
  const han = (text.match(/[\u4E00-\u9FFF]/g) || []).length;
  const hira = (text.match(/[\u3040-\u30FF]/g) || []).length;
  const hang = (text.match(/[\uAC00-\uD7AF]/g) || []).length;
  if (ar >= 2) return "ar";
  if (hira >= 2) return "ja";
  if (hang >= 2) return "ko";
  if (han >= 2) return "zh";
  if (cyr >= 2) return "ru";
  return null;
}

const TR_MARK =
  /[ğüşıöçĞÜŞİÖÇ]|\b(merhaba|selam|merhabalar|nasılsın|nasilsin|nasıl|nasil|nerede|nedir|lütfen|lutfen|teşekkür|tesekkur|teşekkürler|evet|hayır|hayir|tamam|değil|degil|istiyorum|yapabilir|günaydın|gunaydin|naber|misin|mısın|musun|müsün|için|icin|benim|senin|bana|sana)\b/i;
const EN_MARK =
  /\b(hello|hey|howdy|thanks|please|what|where|when|why|who|how|are|you|the|this|that|have|with|from|your|good|morning|evening|help|need|could|would|can't|don't|doing)\b/i;
const EN_GREET = /^(hi|hey|hello|howdy|yo)(\s|$)/i;
const TR_GREET = /^(merhaba|selam|slm|merhabalar|naber)(\s|$)/i;
const AR_GREET = /^(مرحبا|أهلا|اهلا|السلام)/;

export function detectMessageLanguage(text: string): string | null {
  const raw = String(text || "").trim();
  if (!raw) return null;
  const script = scriptLanguage(raw);
  if (script) return script;
  if (isAmbiguousAskText(raw)) return null;
  const n = fold(raw);
  if (AR_GREET.test(n)) return "ar";
  if (TR_GREET.test(n) || TR_MARK.test(n)) return "tr";
  if (EN_GREET.test(n) || EN_MARK.test(n)) return "en";
  return null;
}

export function localeHintFromTimeZone(timeZone?: string): string {
  const tz = timeZone || "";
  if (/Riyadh|Dubai|Qatar|Kuwait|Bahrain|Muscat|Baghdad|Amman|Beirut|Cairo|Casablanca|Tunis|Algiers|Tripoli|Rabat|Gaza/i.test(tz)) {
    return "ar";
  }
  if (/Is
... 