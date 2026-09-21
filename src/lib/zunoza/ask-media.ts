type MediaMsg = { role: string; images?: string[] };

export const VISION_MODELS = ["grok-4-fast-non-reasoning", "grok-4", "grok-2-vision-1212"] as const;
export const MAX_ASK_IMAGES = 8;
const MAX_IMAGE_CHARS = 1_200_000;
const MAX_IMAGES_CHARS = 2_200_000;

export type AskApiTurn = {
  role: string;
  content:
    | string
    | Array<
        | { type: "text"; text: string }
        | { type: "image_url"; image_url: { url: string; detail: "high" } }
      >;
};

export function isDataImage(url: unknown): url is string {
  return typeof url === "string" && /^data:image\/(jpeg|jpg|png)/i.test(url) && url.length < MAX_IMAGE_CHARS;
}

function isKeptAskImage(url: unknown): url is string {
  return isDataImage(url) || (typeof url === "string" && /^\/api\/sor-ekler\/[A-Za-z0-9-]+\/indir/.test(url));
}

export function sanitizeAskImages(urls: unknown, limit = MAX_ASK_IMAGES) {
  if (!Array.isArray(urls)) return [] as string[];
  const out: string[] = [];
  let chars = 0;
  for (const url of urls) {
    if (!isDataImage(url)) continue;
    if (chars + url.length > MAX_IMAGES_CHARS) break;
    out.push(url);
    chars += url.length;
    if (out.length >= limit) break;
  }
  return out;
}

/** Keep the last attached photo/video frames on follow-up turns. */
export function carryForwardImages<T extends MediaMsg>(messages: T[]): T[] {
  let last: string[] = [];
  for (const m of messages) {
    if (m.role === "user") {
      const imgs = (m.images || []).filter(isKeptAskImage).slice(0, MAX_ASK_IMAGES);
      if (imgs.length) last = imgs;
    }
  }
  if (!last.length) return messages;
  let lastUser = -1;
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i]?.role === "user") {
      lastUser = i;
      break;
    }
  }
  if (lastUser < 0) return messages;
  const row = messages[lastUser];
  if (!row || (row.images || []).some(isKeptAskImage)) return messages;
  return messages.map((m, i) => (i === lastUser ? { ...m, images: last } : m));
}

export function wantsVisionGroundedSearch(text: string) {
  const n = text.toLocaleLowerCase("tr-TR");
  return /ilaç|ilac|prospektüs|prospektus|etken madde|tablet|kapsül|kapsul|mg\b|doz|yan etki|fiyat|nerede sat|ne işe yarar|ne ise yarar|nedir\b|hangi ilaç|hangi ilac|modeli ne|markası ne|markasi ne/.test(
    n,
  );
}

export function visionSystemExtra() {
  return `Görsel veya video karesi bu istekteyse içeriğe bakarak cevap ver. Görmediğin şeyi görmüş gibi uydurma. Yazı okunmuyorsa “bu bölüm net değil” de. Video kareleri zaman damgalıdır; sorulan saniye örneklenmediyse uydurma. İlaç/sağlık: ambalajdaki adı, dozu ve genel kullanım bilgisini söyleyebilirsin; kişiye özel teşhis veya reçete yazma. Gerekirse doktor/eczacıya danışılmasını belirt ama kullanıcıyı “yardımcı olamam” deyip bırakma.`;
}

export function toAskApiTurns(
  messages: Array<{ role: string; content: string; images?: string[] }>,
): AskApiTurn[] {
  return messages.map((m) => {
    const images = m.role === "user" ? sanitizeAskImages(m.images) : [];
    if (!images.length) return { role: m.role, content: m.content };
    return {
      role: m.role,
      content: [
        { type: "text" as const, text: m.content || "Eklediğim dosyaya bak." },
        ...images.map((url) => ({
          type: "image_url" as const,
          image_url: { url, detail: "high" as const },
        })),
      ],
    };
  });
}
