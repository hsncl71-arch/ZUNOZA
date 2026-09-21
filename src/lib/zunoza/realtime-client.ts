const TARGET_RATE = 24_000;

export type VoiceLiveStatus = "idle" | "connecting" | "live" | "speaking" | "listening" | "reconnecting" | "error";

import { DEFAULT_LIVE_VOICE, liveSessionConfig, resolveLiveVoice, type LiveVoiceId } from "@/lib/zunoza/voices";
import { wantsWebSearch } from "@/lib/zunoza/web-search-intent";
import {
  isFatalLiveError,
  isInternalLiveError,
  summarizeLiveTurn,
  type LiveTurnMetrics,
} from "@/lib/zunoza/live-errors";
export { LIVE_VOICES, DEFAULT_LIVE_VOICE, resolveLiveVoice, type LiveVoiceId } from "@/lib/zunoza/voices";
export { isFatalLiveError, isInternalLiveError, summarizeLiveTurn, type LiveTurnMetrics } from "@/lib/zunoza/live-errors";

type Handlers = {
  onStatus: (status: VoiceLiveStatus) => void;
  onUserText: (text: string, final: boolean) => void;
  onAssistantText: (text: string, final: boolean) => void;
  onSources?: (urls: string[]) => void;
  onError: (message: string, fatal?: boolean) => void;
  refreshSession?: () => Promise<{ clientSecret: string; wsUrl: string }>;
};

export type LiveAudioSession = {
  ctx: AudioContext;
  speaker: HTMLAudioElement;
  dest: MediaStreamAudioDestinationNode;
  ready: Promise<void>;
};

function audioContextCtor() {
  const w = window as unknown as {
    AudioContext?: typeof AudioContext;
    webkitAudioContext?: typeof AudioContext;
  };
  return w.AudioContext || w.webkitAudioContext;
}

function delay(ms: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, ms));
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = window.setTimeout(() => reject(new Error("timeout")), ms);
    promise.then(
      (v) => {
        window.clearTimeout(t);
        resolve(v);
      },
      (e) => {
        window.clearTimeout(t);
        reject(e);
      },
    );
  });
}

/** Call this synchronously from the Canlı Konuş tap — before any network await. */
export function beginLiveAudio(speaker?: HTMLAudioElement | null): LiveAudioSession {
  const Ctor = audioContextCtor();
  if (!Ctor) throw new Error("Bu tarayıcı canlı sesi desteklemiyor.");
  const ctx = new Ctor({ sampleRate: TARGET_RATE });
  const dest = ctx.createMediaStreamDestination();
  const el = speaker ?? document.createElement("audio");
  el.setAttribute("playsinline", "true");
  el.setAttribute("webkit-playsinline", "true");
  (el as HTMLAudioElement & { playsInline?: boolean }).playsInline = true;
  el.muted = false;
  el.volume = 1;
  if (!el.isConnected) {
    el.style.display = "none";
    document.body.appendChild(el);
  }
  el.srcObject = dest.stream;
  void ctx.resume().catch(() => undefined);
  try {
    const unlock = ctx.createBufferSource();
    unlock.buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
    unlock.connect(ctx.destination);
    unlock.start(0);
  } catch {
    /* ignore */
  }
  try {
    const keep = ctx.createConstantSource();
    keep.offset.value = 0;
    keep.connect(dest);
    keep.start();
  } catch {
    /* ignore */
  }
  void el.play().catch(() => undefined);
  const ready = Promise.race([ctx.resume().then(() => undefined).catch(() => undefined), delay(200)]);
  return { ctx, speaker: el, dest, ready };
}

export async function getMicrophoneStream() {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("Bu tarayıcı mikrofonu desteklemiyor. iPhone’da Safari kullanın.");
  }
  return navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      channelCount: 1,
    },
  });
}

function downsample(input: Float32Array, fromRate: number, toRate: number) {
  if (fromRate === toRate) return input;
  const ratio = fromRate / toRate;
  const outLen = Math.max(1, Math.floor(input.length / ratio));
  const out = new Float32Array(outLen);
  for (let i = 0; i < outLen; i++) {
    const x = i * ratio;
    const i0 = Math.floor(x);
    const i1 = Math.min(i0 + 1, input.length - 1);
    const f = x - i0;
    out[i] = (input[i0] ?? 0) * (1 - f) + (input[i1] ?? 0) * f;
  }
  return out;
}

function floatToPcm16Base64(float32: Float32Array) {
  const bytes = new Uint8Array(float32.length * 2);
  const view = new DataView(bytes.buffer);
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i] ?? 0));
    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function pcm16Base64ToFloat(b64: string) {
  const binary = atob(b64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
  const view = new DataView(bytes.buffer);
  const samples = new Float32Array(Math.floor(len / 2));
  for (let i = 0; i < samples.length; i++) samples[i] = view.getInt16(i 
... 