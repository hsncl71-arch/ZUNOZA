import { type XaiAspect } from "./video-request.ts";

export const MEMORY_MOTIONS = [
  {
    id: "dogal",
    label: "Doğal Canlandır",
    beat: "Keep the original pose. Add only tiny living motion: natural breathing, a slow blink, a slight weight shift. No large gestures, walking, dancing, or camera moves.",
  },
  {
    id: "bakis",
    label: "Birbirine Bakış",
    beat: "If two or more people: they slowly glance toward each other while staying in place. Distance, bodies, and framing stay locked. If one person: eyes drift softly aside then return. Arms do not reach or pass through anyone.",
  },
  {
    id: "gulumse",
    label: "Gülümseme",
    beat: "A small, real smile on the existing mouth shape. Do not change teeth, jaw, age, or face structure. No wide grin, no beauty filter.",
  },
  {
    id: "sarilma",
    label: "Sarılma",
    beat: "If people are already close, keep a soft living hug: tiny shoulder settle, no new limbs. Do not merge bodies, do not add arms, do not push people through each other. If only one person: a gentle inhale and still pose. Never add another person.",
  },
  {
    id: "kamera",
    label: "Kameraya Bakış",
    beat: "Eyes slowly meet the camera. Head turns only a few degrees. Keep the original composition, distance, and body pose.",
  },
] as const;

export type MemoryMotionId = (typeof MEMORY_MOTIONS)[number]["id"];

/** grok-imagine-video-1.5 generate durations: 5, 10, 15. */
export const MEMORY_SECONDS = [5, 10, 15] as const;
export type MemorySeconds = (typeof MEMORY_SECONDS)[number];
export const MEMORY_DEFAULT_SECONDS: MemorySeconds = 5;

export const MEMORY_NEGATIVE =
  "identity change, face swap, face morph, different person, extra people, missing people, change number of people, deformed face, melted face, extra fingers, missing fingers, deformed hands, extra arms, limbs intersecting, bodies merging, warped body, clothing change, costume change, hair change, age change, background change, new location, modernize, colorize if original is black and white, cartoon, 3d render, cgi, talking, lip sync, open mouth speech, dialogue, voiceover, singing, extreme motion, walking, dancing, camera whip, morphing, warping, aging, de-aging, beauty filter, makeup change";

export function isMemoryMotion(id: string): id is MemoryMotionId {
  return MEMORY_MOTIONS.some((row) => row.id === id);
}

export function memoryMotion(id: string) {
  return MEMORY_MOTIONS.find((row) => row.id === id) ?? MEMORY_MOTIONS[0];
}

export function memoryProviderSeconds(uiSeconds?: number): MemorySeconds {
  if (uiSeconds === 10 || uiSeconds === 15) return uiSeconds;
  return 5;
}

export function buildMemoryClipPrompt(motionId: string, uiSeconds: MemorySeconds = MEMORY_DEFAULT_SECONDS) {
  const motion = memoryMotion(motionId);
  const seconds = memoryProviderSeconds(uiSeconds);
  return [
    "IMAGE-TO-VIDEO from the exact uploaded photograph. Do not replace the image.",
    "IDENTITY LOCK: keep every person identical to the photo — same faces, age, skin, eyes, mouth, teeth, hair, body shape, clothing, jewelry, and the same number of people.",
    "Do not add people. Do not remove people. Do not swap or mix faces. Do not change the background, era, film grain, lighting, or colors.",
    "Do not crop. Do not beautify. Do not modernize. Preserve original composition and framing.",
    "Motion must be small, natural, and emotional: blinks, slight head turns, a gentle smile or glance. No large body motion. Hands, arms, and faces must not pass through each other. No extra fingers, extra arms, double faces, or melting faces.",
    `Selected motion: ${motion.label}. ${motion.beat}`,
    `Duration: ${seconds} seconds. Almost static camera. SILENT: no speech, no lip sync, no fake voices, no music.`,
  ].join(" ");
}

export function aspectFromSize(width: number, height: number): XaiAspect {
  const ratio = width / Math.max(1, height);
  const options: { id: XaiAspect; value: number }[] = [
    { id: "16:9", value: 16 / 9 },
    { id: "9:16", value: 9
... 