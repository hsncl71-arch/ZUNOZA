import {
  clampXaiAspect,
  imagineDuration,
  type VideoQuality,
  xaiResolution,
  videoMode,
  normalizeVoiceMode,
  voicePromptSuffix,
} from "./video-request.ts";

/** Local prompt director — no extra model call. Only real grok-imagine-video-1.5 fields. */

const UNSUPPORTED = [
  { re: /video\s*edit|videoyu düzenle|videoyu duzenle|extend video|videoyu uzat/i, note: "Video edit/uzatma bu modelde yok." },
  { re: /4k|2160p/i, note: "4K yok; en fazla 1080p." },
  { re: /60\s*saniye|1\s*dakika|dakikalık video|30\s*saniye/i, note: "Süre en fazla 15 saniye. Daha uzun video için birden fazla klip üretip Montaj’da birleştirin." },
];

type DirectionRule = { id: string; re: RegExp; line: string };

const CAMERA_RULES: DirectionRule[] = [
  { id: "orbit", re: /etraf[ıi]nda d[öo]n|orbit|360\s*(derece|shot)?|çevresinde d[öo]n/i, line: "Gentle cinematic orbit around the subject; horizon locked, continuous shot." },
  { id: "dolly-in", re: /yava[şs] yakla[şs]|dolly[\s-]?in|zoom[\s-]?in|yak[ıi]nla[şs]|i[çc]eri kayd[ıi]r/i, line: "Slow cinematic dolly-in; smooth motivated camera, no snap zoom." },
  { id: "dolly-out", re: /uzakla[şs]|dolly[\s-]?out|zoom[\s-]?out|geri [çc]ek/i, line: "Slow cinematic dolly-out; keep the subject framed and identifiable." },
  { id: "tracking", re: /takip [çc]ekimi|tracking shot|yan[ıi]ndan ge[çc]| paralel takip/i, line: "Tracking shot matching subject motion; consistent speed, no cuts." },
  { id: "pan", re: /yana kayd[ıi]r|\bpan\b|panoramik kayd[ıi]rma/i, line: "Smooth horizontal pan; tripod-stable, no handheld shake." },
  { id: "tilt", re: /yukar[ıi] bak|a[şs]a[ğg][ıi] bak|\btilt\b|ba[şs][ıi] kald[ıi]r/i, line: "Controlled tilt; keep verticals clean, continuous move." },
  { id: "crane", re: /vin[çc]|\bcrane\b|drone|havadan|aerial reveal/i, line: "Slow crane or aerial reveal; stable horizon, cinematic altitude change." },
  { id: "handheld", re: /elde kamera|handheld|sars[ıi]nt[ıi]|dok[üu]menter elde/i, line: "Subtle handheld documentary camera; natural micro-movement only." },
  { id: "static", re: /sabit kamera|tripod|statik [çc]ekim|locked[\s-]?off|static shot/i, line: "Locked-off tripod; motion lives in the scene, not the camera." },
  { id: "slow", re: /yava[şs] kamera|slow camera|yava[şs] hareket|ak[ıi]c[ıi] kamera/i, line: "Slow, fluid camera; one continuous take, no sudden cuts." },
];

const LIGHT_RULES: DirectionRule[] = [
  { id: "golden", re: /g[üu]n bat[ıi]m[ıi]|golden hour|alt[ıi]n saat|warm sunset/i, line: "Golden-hour motivated light; warm key, long shadows, consistent sun direction." },
  { id: "blue", re: /mavi saat|blue hour|alacakaranl[ıi]k/i, line: "Blue-hour ambient light; cool sky fill, practical lamps if present." },
  { id: "neon", re: /\bneon\b|renkli tabela|cyberpunk [ıi][şs][ıi]k/i, line: "Neon practicals as key light; colored bounce, wet-street reflections if outdoors." },
  { id: "moon", re: /ay [ıi][şs][ıi][ğg][ıi]|moonlight|gece [ıi][şs][ıi][ğg][ıi]/i, line: "Moonlight key; cool rim, deep shadows, no random extra sun." },
  { id: "volumetric", re: /hacimsel|volumetric|god rays|i[şs][ıi]k huzme|tozlu [ıi][şs][ıi]k/i, line: "Volumetric light beams through atmosphere; visible air, stable beam direction." },
  { id: "studio", re: /st[üu]dyo [ıi][şs][ıi][ğg][ıi]|studio light|softbox|üç nokta/i, line: "Soft studio key and fill; controlled rim, no outdoor sun mismatch." },
  { id: "overcast", re: /kapal[ıi] hava|overcast|bulutlu g[üu]n|yumu[şs]ak g[üu]nd[üu]z/i, line: "Soft overcast daylight; low contrast, even wrap, no hard sun." },
  { id: "practical", re: /[çc]ad[ıi]r [ıi][şs][ıi][ğg][ıi]|lamba [ıi][şs][ıi][ğg][ıi]|practical light|mum [ıi][şs][ıi][ğg][ıi]|pencere [ıi][şs][ıi][ğg][ıi]/i, line: "Practical motivated lighting from sources in the scene; warm interior falloff." },
  { id: "rim", re: /kenar [ıi][şs][ıi][ğg][ıi]|rim light|ters [ıi][şs][ıi]k/i, line: "Strong rim light separating subject from background; consistent backlight side." },
];

const STYLE_RULE
... 