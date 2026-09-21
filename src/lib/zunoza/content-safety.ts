export const CONTENT_SAFETY_MESSAGE =
  "Bu istek güvenlik kurallarına aykırı. Pornografik, cinsel veya kumar içerikleri üretilemez.";

function fold(text: string) {
  return text
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/İ/g, "i")
    .replace(/ş/g, "s")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const SEXUAL = [
  "porno",
  "pornografi",
  "porn ",
  " porn",
  "xxx",
  "nsfw",
  "onlyfans",
  "nude",
  "naked",
  "ciplak",
  "cinsel iliski",
  "cinsel icerik",
  "erotik",
  "erotic",
  "sex tape",
  "seks video",
  "seks sahne",
  "masturb",
  "orgazm",
  "hardcore",
  "hentai",
  "incest",
];

const GAMBLING = [
  "kumar",
  "bahis oyna",
  "online bahis",
  "casino",
  "slot makine",
  "rulet oyna",
  "poker hile",
];

const CHILD = ["cocuk", "child", "underage", "minor", "kucuk yas"];
const CHILD_SEXUAL = ["seks", "porn", "ciplak", "nude", "naked", "erotik", "cinsel"];

function hasAny(haystack: string, needles: string[]) {
  return needles.some((n) => haystack.includes(n.trim()));
}

export function isProhibitedGeneration(text: string) {
  const raw = fold(text);
  if (!raw) return false;
  if (hasAny(raw, SEXUAL) || hasAny(raw, GAMBLING)) return true;
  const child = hasAny(raw, CHILD);
  const sexual = hasAny(raw, CHILD_SEXUAL);
  return child && sexual;
}

export function assertSafeGeneration(...parts: Array<string | null | undefined>) {
  const joined = parts.filter(Boolean).join(" ");
  if (isProhibitedGeneration(joined)) throw new Error(CONTENT_SAFETY_MESSAGE);
}
