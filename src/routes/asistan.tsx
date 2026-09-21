import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Volume2, VolumeX, Copy } from "lucide-react";
import { AppGate } from "@/components/gate";
import { Button } from "@/components/ui/button";
import { ZunozaGlyph } from "@/components/logo";
import { speakAssistant, clientClock, formatDeviceClock, ASSISTANT_WELCOME, type AssistantReply, type ChatMessage } from "@/lib/zunoza/assistant";
import { streamZunozaAsk, friendlyClientError } from "@/lib/zunoza/ask-stream";
import {
  ASK_SUGGESTIONS,
  applyAskDelta,
  askSendKey,
  attachStoredAskImages,
  clearAskThread,
  extractSourceUrls,
  isAskAttachmentPath,
  lastDataImage,
  liveContextFromThread,
  loadAskThread,
  loadAskVoiceOn,
  persistableAskMessages,
  saveAskThread,
  saveAskVoiceOn,
} from "@/lib/zunoza/ask-thread";
import { describeAskImageForLive, loadAskConversation, persistAskConversation, resetAskConversation, parseAskAttachmentId } from "@/lib/zunoza/ask-conversation";
import { listMemories, tryMemoryCommand } from "@/lib/zunoza/memory";
import { createVoiceLiveSession } from "@/lib/zunoza/voice-live";
import { GrokVoiceLive, beginLiveAudio, getMicrophoneStream, DEFAULT_LIVE_VOICE, isFatalLiveError, isInternalLiveError, type VoiceLiveStatus } from "@/lib/zunoza/realtime-client";
import { useBootstrap } from "@/components/bootstrap";
import { ASK_EVENT, consumeLiveStartFlag, consumePendingAsk, LIVE_START_EVENT, type ComposerAskDetail } from "@/lib/zunoza/composer-events";
import { editStudioImage, generateStudioImage } from "@/lib/zunoza/images";
import { stashEditSource, wantsImageEdit } from "@/lib/zunoza/image-edit";
import { promptKeyForAction, writeSessionJson } from "@/lib/zunoza/studio-handoff";

export const Route = createFileRoute("/asistan")({ component: Page });

const ACTION_LABEL: Record<string, string> = {
  video: "Video Stüdyosuna aktar",
  image: "Görsel Stüdyoya aktar",
  voice: "Seslendirme Stüdyosuna aktar",
  storyboard: "Storyboard’a aktar",
  montage: "Montaj Stüdyosuna aktar",
  cover: "Kapak stüdyosuna aktar",
  script: "Senaryo’ya aktar",
  social: "Sosyal Medya’ya aktar",
  builder: "İnşa Et’e aktar",
};

const LIVE_LABEL: Record<VoiceLiveStatus, string> = {
  idle: "Yazın veya canlı konuşun",
  connecting: "Bağlanıyor…",
  reconnecting: "Bağlantı yeniden kuruluyor…",
  live: "Dinliyor — konuşabilirsiniz",
  listening: "Sizi dinliyor",
  speaking: "ZUNOZA konuşuyor — araya girebilirsiniz",
  error: "Bağlanamadı — tekrar deneyin",
};

function liveStartError(err: unknown): string {
  const name = err && typeof err === "object" && "name" in err ? String((err as { name: string }).name) : "";
  const msg = err instanceof Error ? err.message : "";
  if (
    name === "NotAllowedError" ||
    name === "PermissionDeniedError" ||
    /notallowed|permission|denied|izin/i.test(msg)
  ) {
    return "Mikrofon izni verilmedi. iPhone’da Ayarlar > Safari (veya ZUNOZA) > Mikrofon’u açıp tekrar deneyin.";
  }
  if (name === "NotFoundError" || /not found|mikrofon bulunamadı/i.test(msg)) {
    return "Mikrofon bulunamadı. Kulaklık veya mikrofon bağlantısını kontrol edin.";
  }
  if (name === "NotReadableError" || name === "AbortError") {
    return "Mikrofon şu an kullanılamıyor. Diğer uygulamayı kapatıp tekrar deneyin.";
  }
  if (msg) return msg;
  return "Mikrofon veya canlı ses açılamadı.";
}

function Page() {
  return (
    <AppGate>
      <Assistant />
    </AppGate>
  );
}

function Assistant() {
  const nav = useNavigate();
  const { data } = useBootstrap();
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: ASSISTANT_WELCOME },
  ]);
  const [voiceOn, setVoiceOn] = useState(false);
  const [threadReady, setThreadReady] = useState(false);
  const [live, setLive] = useState<VoiceLiveStatus>("idle");
  const [sources, setSources] = useState<string[]>([]);
  const [micMuted, setMicMuted] = useState(false);
  const [livePreview, setLivePreview] = useState<{ role: "user" | "assistant"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [last, setLast] = useState<AssistantReply | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const liveSpeakerRef = useRef<HTMLAudioElement | null>(null);
  const blobUrlRef = useRef<string |
... 