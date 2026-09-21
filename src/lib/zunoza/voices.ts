import { ASK_PERSONA_LIVE } from "./ask-persona.ts";
import { founderProfileSystem } from "./brand.ts";

/** xAI Grok Voice Agent IDs — from official Voice API docs, not invented. */
export const LIVE_VOICES = [
  { id: "Sal", label: "Sal — orta ton, sıcak, doğal erkek" },
  { id: "Castor", label: "Castor — samimi, genç erkek" },
  { id: "Naksh", label: "Naksh — sıcak, düşünceli erkek" },
  { id: "Rigel", label: "Rigel — sakin profesyonel erkek" },
  { id: "Leo", label: "Leo — güçlü erkek" },
  { id: "Rex", label: "Rex — tok, olgun erkek" },
  { id: "Atlas", label: "Atlas — güven veren olgun erkek" },
  { id: "Perseus", label: "Perseus — tok, güvenilir erkek" },
  { id: "Ara", label: "Ara — sıcak kadın" },
  { id: "Eve", label: "Eve — enerjik kadın" },
] as const;

export type LiveVoiceId = (typeof LIVE_VOICES)[number]["id"];

export const DEFAULT_LIVE_VOICE: LiveVoiceId = "Sal";

export const LIVE_TURN = {
  type: "server_vad" as const,
  threshold: 0.55,
  prefix_padding_ms: 80,
  silence_duration_ms: 280,
  create_response: true,
  interrupt_response: true,
};

/** xAI grok-voice default is "high" (~5–7s think). "none" keeps tool search but starts speaking immediately. */
export const LIVE_REASONING = { effort: "none" as const };

export function liveSessionConfig(opts: {
  clockLine?: string;
  memoryNotes?: string;
  searchOn?: boolean;
  voice?: string;
  threadContext?: string;
}) {
  const searchOn = opts.searchOn !== false;
  return {
    voice: resolveLiveVoice(opts.voice),
    instructions: liveInstructions(opts.clockLine, opts.memoryNotes, searchOn, opts.threadContext),
    reasoning: LIVE_REASONING,
    tools: searchOn ? [{ type: "web_search" }] : [],
    turn_detection: { ...LIVE_TURN },
    audio: {
      input: {
        format: { type: "audio/pcm", rate: 24_000 },
        transcription: {},
      },
      output: { format: { type: "audio/pcm", rate: 24_000 } },
    },
  };
}

export function liveInstructions(clockLine?: string, memoryNotes?: string, searchOn = true, threadContext?: string) {
  return [
    "Sen ZUNOZA AI’sın. Kullanıcının konuştuğu dilde, kısa, sıcak, orta tonda genç-doğal erkek sesiyle konuş.",
    "Yalnızca video asistanı değilsin. Genel sorular, sohbet, yazı, analiz, görsel ve güncel araştırma da işin.",
    "Kullanıcı susar susmaz ilk hecede cevap ver. Sessiz düşünme, doldurucu kullanma. Cümleyi yarım bırakma.",
    "Kullanıcı kısa duraklarsa sözünü kesme, konuşması bitsin.",
    "Kalın, soğuk veya robotik konuşma.",
    ASK_PERSONA_LIVE,
    founderProfileSystem(),
    `Cihaz saati: ${clockLine || "bilinmiyor"}. Tarih/saat için yalnızca bunu söyle.`,
    "Fotoğraf düzenleme isteğinde yapamıyorum deme; görsel stüdyo bunu yapar, kısa onay ver.",
    "Kullanıcı “ben kimim / adım ne” derse kayıtlı adı söyle. Adı biliyorsan tekrar sorma. Şirket sorusunda kayıtlı şirket adını söyle.",
    "Hafızaya kaydettiğini anons etme. Küfür veya kızgınlık isim düzeltmesi değildir; düzeltiyorum/kaydettim deme. Yanındakiyle konuşmayı isim/profil olarak alma. İsmi yalnızca kullanıcı açıkça düzeltirse değiştir.",
    "web_search kullanılabilir. Kullanıcı araştır demesini bekleme. Güncel fiyat, iPhone/ürün fiyatı, haber, döviz, maç, hava, telefon numarası veya emin olmadığın güncel bilgiyi hemen ara. “Bilmiyorum” deme; önce ara. Sıradan sohbet, şiir, matematik, sohbet muhabbetinde arama yapma. Cevaba hemen başla.",
    memoryNotes
      ? `Kalıcı kullanıcı notları (sohbet değişse de geçerli): ${memoryNotes}`
      : "Kayıtlı kullanıcı adı yoksa uydurma.",
    threadContext
      ? `Yazılı sohbet ve canlı ses AYNI konuşmadır. "Fotoğrafı göremiyorum" veya önceki mesajı hatırlamıyorum deme. Aktif konuşma: ${threadContext}`
      : "",
  ]
    .filter(Boolean)
    .join(" ");
}

export function resolveLiveVoice(id?: string | null): LiveVoiceId {
  const wanted = (id || "").trim().toLowerCase();
  const hit = LIVE_VOICES.find((v) => v.id.toLowerCase() === wanted);
  return hit?.id ?? DEFAULT_LIVE_VOICE;
}
