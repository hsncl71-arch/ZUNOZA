/** Deterministic specialist routing — no extra model call. */

export type AiSpecialist =
  | "assistant"
  | "web"
  | "memory"
  | "video"
  | "image"
  | "music"
  | "voice"
  | "builder"
  | "none";

export type AiRoute = {
  specialist: AiSpecialist;
  skipModel: boolean;
};

function n(text: string) {
  return text.toLocaleLowerCase("tr-TR").replace(/\s+/g, " ").trim();
}

function has(hay: string, parts: string[]) {
  return parts.some((p) => hay.includes(p));
}

export function routeAiIntent(text: string): AiRoute {
  const t = n(text);
  if (t.length < 2) return { specialist: "none", skipModel: true };

  if (has(t, ["hatırla", "hatirla", "not al", "ben kimim", "adım ne", "adim ne", "şirketimin", "sirketimin"])) {
    return { specialist: "memory", skipModel: false };
  }

  if (
    has(t, ["inşa et", "insa et", "web sitesi", "uygulama yap", "uygulama oluştur", "uygulama olustur", "site yap", "site oluştur", "site olustur"]) ||
    (has(t, ["site", "uygulama", "panel", "mağaza", "magaza"]) && has(t, ["yap", "oluştur", "olustur", "kur", "inşa", "insa"]))
  ) {
    return { specialist: "builder", skipModel: false };
  }

  if (has(t, ["şarkı", "sarki", "müzik üret", "muzik uret", "müzik yap", "muzik yap", "besteci", "lyrics", "şarkı söz"])) {
    return { specialist: "music", skipModel: false };
  }
  if (has(t, ["seslendir", "tts", "ses klon", "kendi sesim"])) {
    return { specialist: "voice", skipModel: false };
  }
  if (has(t, ["görsel", "gorsel", "logo", "afiş", "afis", "kapak görsel"]) && has(t, ["yap", "üret", "uret", "oluştur", "olustur", "düzenle", "duzenle"])) {
    return { specialist: "image", skipModel: false };
  }
  if (has(t, ["video", "klip", "reels", "storyboard"]) && has(t, ["yap", "üret", "uret", "oluştur", "olustur", "çek", "cek"])) {
    return { specialist: "video", skipModel: false };
  }

  return { specialist: "assistant", skipModel: false };
}

export function specialistPath(specialist: AiSpecialist): string | null {
  switch (specialist) {
    case "builder":
      return "/insa-et";
    case "video":
      return "/olustur";
    case "image":
      return "/gorsel";
    case "music":
      return "/muzik";
    case "voice":
      return "/seslendirme";
    default:
      return null;
  }
}
