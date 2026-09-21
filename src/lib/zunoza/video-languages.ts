/**
 * Speech languages for grok-imagine-video-1.5.
 *
 * The Imagine Video REST body has no `language` field — speech is prompt-steered
 * only (`voicePromptSuffix`). xAI does not publish a closed video-speech list.
 * This catalog is the product allowlist: high-resource languages Grok Imagine
 * can generate speech in when instructed. Unknown codes fall back to Turkish.
 * Do not add an id here without a promptName the model can follow.
 */

export type VideoSpeechLanguage = {
  id: string;
  /** Compact product label for the language picker. */
  label: string;
  /** English name folded into the Imagine speech prompt. */
  promptName: string;
};

export const DEFAULT_VIDEO_LANGUAGE = "tr";

/**
 * User-priority languages first, then other reliably prompt-steered languages.
 * Keep ids as ISO 639-1 (zh-CN / pt-BR normalize to zh / pt).
 */
export const VIDEO_SPEECH_LANGUAGES: readonly VideoSpeechLanguage[] = [
  { id: "tr", label: "Türkçe", promptName: "Turkish" },
  { id: "en", label: "İngilizce — English", promptName: "English" },
  { id: "az", label: "Azerbaycanca — Azərbaycan", promptName: "Azerbaijani" },
  { id: "ar", label: "Arapça — العربية", promptName: "Arabic" },
  { id: "de", label: "Almanca — Deutsch", promptName: "German" },
  { id: "fr", label: "Fransızca — Français", promptName: "French" },
  { id: "es", label: "İspanyolca — Español", promptName: "Spanish" },
  { id: "it", label: "İtalyanca — Italiano", promptName: "Italian" },
  { id: "pt", label: "Portekizce — Português", promptName: "Portuguese" },
  { id: "ru", label: "Rusça — Русский", promptName: "Russian" },
  { id: "fa", label: "Farsça — فارسی", promptName: "Persian (Farsi)" },
  { id: "zh", label: "Çince — 中文", promptName: "Mandarin Chinese" },
  { id: "ja", label: "Japonca — 日本語", promptName: "Japanese" },
  { id: "ko", label: "Korece — 한국어", promptName: "Korean" },
  { id: "hi", label: "Hintçe — हिन्दी", promptName: "Hindi" },
  { id: "bn", label: "Bengalce — বাংলা", promptName: "Bengali" },
  { id: "bg", label: "Bulgarca — Български", promptName: "Bulgarian" },
  { id: "cs", label: "Çekçe — Čeština", promptName: "Czech" },
  { id: "da", label: "Danca — Dansk", promptName: "Danish" },
  { id: "id", label: "Endonezce — Bahasa Indonesia", promptName: "Indonesian" },
  { id: "nl", label: "Felemenkçe — Nederlands", promptName: "Dutch" },
  { id: "fi", label: "Fince — Suomi", promptName: "Finnish" },
  { id: "he", label: "İbranice — עברית", promptName: "Hebrew" },
  { id: "sv", label: "İsveççe — Svenska", promptName: "Swedish" },
  { id: "pl", label: "Lehçe — Polski", promptName: "Polish" },
  { id: "hu", label: "Macarca — Magyar", promptName: "Hungarian" },
  { id: "ms", label: "Malayca — Melayu", promptName: "Malay" },
  { id: "no", label: "Norveççe — Norsk", promptName: "Norwegian" },
  { id: "ro", label: "Romence — Română", promptName: "Romanian" },
  { id: "th", label: "Tayca — ไทย", promptName: "Thai" },
  { id: "uk", label: "Ukraynaca — Українська", promptName: "Ukrainian" },
  { id: "ur", label: "Urduca — اردو", promptName: "Urdu" },
  { id: "vi", label: "Vietnamca — Tiếng Việt", promptName: "Vietnamese" },
  { id: "el", label: "Yunanca — Ελληνικά", promptName: "Greek" },
];

const LANGUAGE_BY_ID = new Map(VIDEO_SPEECH_LANGUAGES.map((row) => [row.id, row]));

export function normalizeVideoLanguage(value: string | undefined): string {
  const raw = (value || DEFAULT_VIDEO_LANGUAGE).trim().toLowerCase();
  const id = raw.split(/[-_]/)[0] || DEFAULT_VIDEO_LANGUAGE;
  return LANGUAGE_BY_ID.has(id) ? id : DEFAULT_VIDEO_LANGUAGE;
}

export function videoSpeechLanguage(value: string | undefined): VideoSpeechLanguage {
  const id = normalizeVideoLanguage(value);
  return LANGUAGE_BY_ID.get(id) ?? LANGUAGE_BY_ID.get(DEFAULT_VIDEO_LANGUAGE)!;
}

export function speechLanguageHint(language?: string): string {
  const row = videoSpeechLanguage(language);

... 