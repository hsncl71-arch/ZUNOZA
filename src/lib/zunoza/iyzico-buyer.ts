import { isRealEmail } from "./privacy-mask.ts";

/** Known dummy values previously hardcoded. Never send these. */
export const FORBIDDEN_IDENTITY_SNIPPETS = [
  "11111111111",
  "11111111110",
  "00000000000",
  "+905350000000",
  "905350000000",
  "05350000000",
  "5350000000",
] as const;

export function digitsOnly(value: unknown) {
  return String(value ?? "").replace(/\D/g, "");
}

export function containsForbiddenIdentity(value: unknown): boolean {
  const text = JSON.stringify(value ?? "").toLowerCase();
  return FORBIDDEN_IDENTITY_SNIPPETS.some((item) => text.includes(item.toLowerCase()));
}

export function looksLikeTckn(value: unknown): boolean {
  const raw = digitsOnly(value);
  if (!/^[1-9][0-9]{10}$/.test(raw)) return false;
  if (/^([0-9])\1{10}$/.test(raw)) return false;
  if (FORBIDDEN_IDENTITY_SNIPPETS.includes(raw as (typeof FORBIDDEN_IDENTITY_SNIPPETS)[number])) return false;
  const d = raw.split("").map(Number);
  const odd = d[0] + d[2] + d[4] + d[6] + d[8];
  const even = d[1] + d[3] + d[5] + d[7];
  const tenth = (((odd * 7 - even) % 10) + 10) % 10;
  if (d[9] !== tenth) return false;
  const eleventh = d.slice(0, 10).reduce((sum, n) => sum + n, 0) % 10;
  return d[10] === eleventh;
}

export function looksLikeGsm(value: unknown): boolean {
  try {
    parseGsmNumber(value);
    return true;
  } catch {
    return false;
  }
}

export function parseBuyerName(value: unknown, label: string) {
  const name = String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 50);
  if (name.length < 2) throw new Error(`${label} en az 2 karakter olmalı.`);
  if (!/^[\p{L}\s'.-]+$/u.test(name)) throw new Error(`${label} yalnızca harf içermelidir.`);
  return name;
}

export function parseIdentityNumber(value: unknown) {
  const raw = digitsOnly(value);
  if (!raw) throw new Error("T.C. Kimlik Numarası gerekli.");
  if (raw.length !== 11) throw new Error("T.C. Kimlik Numarası 11 haneli olmalıdır.");
  if (!looksLikeTckn(raw)) throw new Error("T.C. Kimlik Numarası geçersiz.");
  return raw;
}

export function parseGsmNumber(value: unknown) {
  let digits = digitsOnly(value);
  if (digits.startsWith("90") && digits.length === 12) digits = digits.slice(2);
  if (digits.startsWith("0") && digits.length === 11) digits = digits.slice(1);
  if (!/^5[0-9]{9}$/.test(digits)) throw new Error("Cep telefonu 5 ile başlayan 10 haneli olmalıdır.");
  const formatted = `+90${digits}`;
  if (containsForbiddenIdentity(formatted) || containsForbiddenIdentity(digits)) {
    throw new Error("Cep telefonu geçersiz.");
  }
  return formatted;
}

export function parseBuyerCity(value: unknown) {
  const city = String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 40);
  if (city.length < 2) throw new Error("İl gerekli.");
  if (!/^[\p{L}\s'.-]+$/u.test(city)) throw new Error("İl yalnızca harf içermelidir.");
  return city;
}

export type CheckoutBuyerInput = {
  identityNumber: string;
  gsmNumber: string;
  city: string;
};

export type SavedCheckoutFlags = {
  hasIdentity?: boolean;
  hasGsm?: boolean;
  hasCity?: boolean;
  ready?: boolean;
};

/** iyzico Checkout Form BuyerCF required fields. Never invent values. */
export function parseCheckoutBuyerInput(input: CheckoutBuyerInput) {
  return {
    identityNumber: parseIdentityNumber(input.identityNumber),
    gsmNumber: parseGsmNumber(input.gsmNumber),
    city: parseBuyerCity(input.city),
  };
}

/** Client-side: validate only fields the form actually shows. Server still merges saved TCKN/GSM/il. */
export function assertCheckoutDraft(input: CheckoutBuyerInput, saved?: SavedCheckoutFlags | null) {
  if (saved?.ready) return;
  if (!saved?.hasIdentity) parseIdentityNumber(input.identityNumber);
  if (!saved?.hasGsm) parseGsmNumber(input.gsmNumber);
  if (!saved?.hasCity) parseBuyerCity(input.city);
}

export function mergeCheckoutBuyerInput(
  data: { identityNumber?: string; gsmNumber?: string; city?: string },
  saved: { identityNumber?: string; gsmNumber?: string; city?: string },
) {
  return parseCheckoutBuyerInput({
    identityNumber: String(data.identityNumber || "").trim() || String(saved.identityNumber || "").trim(),
    gsmNumber: String(data.gsmNumber || "").trim() || String(saved.gsmNumber || "").trim(),
    city: String(data.city || "").trim() || String(saved.city || "").trim(),
  });
}


export function isBuyerFieldError(message?: string | null) {
  const msg = String(message || "");
  return /T\.C\. Kimlik Numarası|Cep telefonu|İl gerekli|İl yalnızca|Ad en az|Soyad en az|Ad yalnızca|Soyad yalnızca|hesap adınız gerekli|gerçek hesap e-postası/.test(
    msg,
  );
}

export function redactIdentity(text: string) {
  return String(text || "")
    .replace(/\b[1-9][0-9]{10}\b/g, "[gizli]")
    .replace(/\+90[0-9]{10}/g, "[gizli]")
    .replace(/identityNumber\s*[:=]\s*["']?[^"',}\s]+/gi, "identityNumber:[gizli]")
    .replace(/gsmNumber\s*[:=]\s*["']?[^"',}\s]+/gi, "gsmNumber:[gizli]");
}

export function assertSafeIyzicoPayload(payload: unknown) {
  if (containsForbiddenIdentity(payload)) {
    throw new Error("Ödeme isteğinde sahte kimlik alanı tespit edildi.");
  }
  walkBuyerKeys(payload);
}

function walkBuyerKeys(value: unknown) {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    for (const item of value) walkBuyerKeys(item);
    return;
  }
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    if (key === "identityNumber" || key === "identitynumber") {
      if (Strin
... 