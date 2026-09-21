export const EDIT_SOURCE_KEY = "zunoza.editSource";

export function wantsImageEdit(text: string) {
  const n = text.toLocaleLowerCase("tr-TR");
  return /düzenle|duzenle|arka plan|arkaplan|cuma|bayram|mesajı görsel|mesi görsel|edit|background|kapak yap|fotoğrafı|fotografi|bunu yap|görseli yap|gorseli yap|profesyonel|ürünü koru|urunu koru|9:16|referans/.test(
    n,
  );
}

export function stashEditSource(prompt: string, imageDataUrl?: string | null) {
  if (!imageDataUrl?.startsWith("data:image/")) return;
  try {
    sessionStorage.setItem(EDIT_SOURCE_KEY, JSON.stringify({ prompt, imageDataUrl }));
  } catch {
    /* ignore */
  }
}

export function takeEditSource() {
  try {
    const raw = sessionStorage.getItem(EDIT_SOURCE_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(EDIT_SOURCE_KEY);
    const parsed = JSON.parse(raw) as { prompt?: string; imageDataUrl?: string };
    if (!parsed.imageDataUrl?.startsWith("data:image/")) return null;
    return { prompt: parsed.prompt || "", imageDataUrl: parsed.imageDataUrl };
  } catch {
    return null;
  }
}
