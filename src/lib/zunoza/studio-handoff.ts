export const MUSIC_HANDOFF_KEY = "zunoza.studioMusic";
export const AUDIO_HANDOFF_KEY = "zunoza.studioAudio";
export const STORYBOARD_HANDOFF_KEY = "zunoza.storyboardHandoff";
export const VIDEO_CLIP_KEY = "zunoza.videoClip";
export const VIDEO_RETRY_KEY = "zunoza.videoRetry";

export const PROMPT_KEYS = {
  olustur: "zunoza.olusturPrompt",
  gorsel: "zunoza.gorselPrompt",
  muzik: "zunoza.muzikPrompt",
  voice: "zunoza.voicePrompt",
  clip: "zunoza.clipPrompt",
  script: "zunoza.scriptPrompt",
  social: "zunoza.socialPrompt",
} as const;

export function jobMediaKey(jobId: string) {
  return `zunoza.jobMedia.${jobId}`;
}

export function promptKeyForAction(action: string) {
  if (action === "video") return PROMPT_KEYS.olustur;
  if (action === "image" || action === "cover") return PROMPT_KEYS.gorsel;
  if (action === "voice") return PROMPT_KEYS.voice;
  if (action === "storyboard") return PROMPT_KEYS.clip;
  if (action === "script") return PROMPT_KEYS.script;
  if (action === "social") return PROMPT_KEYS.social;
  if (action === "music") return PROMPT_KEYS.muzik;
  return null;
}

export type VideoRetryPayload = {
  prompt: string;
  durationSeconds: 5 | 10 | 15;
  aspect: string;
  quality: "ekonomik" | "standart" | "hd" | "ultra";
  voiceMode?: string;
  voiceInstruction?: string;
  language?: string;
  sourceKind?: "metin" | "gorsel" | "referans";
  negativePrompt?: string | null;
};

export type MusicHandoff = {
  id: string;
  prompt?: string;
  audioUrl?: string;
  durationSeconds?: number;
};

export type AudioHandoff = {
  id: string;
  text?: string;
  audioUrl?: string;
  voiceId?: string;
  language?: string;
};

export type StoryboardHandoff = {
  storyboardId: string | null;
  title?: string;
  scenes?: { prompt: string; seconds: number }[];
  musicId?: string | null;
  audioId?: string | null;
};

export type VideoClipHandoff = {
  jobId: string;
  title?: string;
  duration?: number;
  aspect?: string;
};

export type JobMediaHandoff = {
  audio?: AudioHandoff | null;
  music?: MusicHandoff | null;
};

export function writeSessionJson(key: string, value: unknown) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable */
  }
}

export function takeSessionJson(key: string): unknown {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    sessionStorage.removeItem(key);
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

export function peekSessionJson(key: string): unknown {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

export function takePromptText(key: string): string | null {
  const row = asRecord(takeSessionJson(key));
  const prompt = String(row?.prompt ?? "").trim();
  return prompt.length >= 1 ? prompt : null;
}

/** Product durations are 5 / 10 / 15. Legacy 30s dual-scene clamps to 15. */
export function clampStudioDuration(value: number): 5 | 10 | 15 {
  if (value === 15 || value === 30) return 15;
  if (value === 10) return 10;
  if (value === 5) return 5;
  return 5;
}

function asRecord(input: unknown): Record<string, unknown> | null {
  if (!input || typeof input !== "object") return null;
  return input as Record<string, unknown>;
}

export function parseVideoRetry(input: unknown): VideoRetryPayload | null {
  const row = asRecord(input);
  if (!row) return null;
  const prompt = String(row.prompt ?? "").trim();
  if (prompt.length < 8) return null;
  const qualityRaw = String(row.quality ?? "");
  const quality =
    qualityRaw === "standart" || qualityRaw === "hd" || qualityRaw === "ultra" ? qualityRaw : "ekonomik";
  return {
    prompt,
    durationSeconds: clampStudioDuration(Number(row.durationSeconds)),
    aspect: String(row.aspect ?? "9:16"),
    quality,
    voiceMode: row.voiceMode ? String(row.voiceMode) : undefined,
    voiceInstruction: row.voiceInstruction ? String(row.voiceInstruction) : undefined,
    language: row.language ? String(row.language) : undefined,
    sour
... 