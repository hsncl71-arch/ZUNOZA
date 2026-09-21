/** Client-safe music style catalog. Prompt-steered — ElevenLabs has no genre enum. */

export const CUSTOM_STYLE_ID = "ozel";
export const MUSIC_STYLE_NOTE_MAX = 400;

export type MusicStyleGroup = "turkiye" | "world" | "custom";

export type MusicStyle = {
  id: string;
  label: string;
  group: MusicStyleGroup;
  hint: string;
};

export const MUSIC_STYLES: MusicStyle[] = [
  {
    id: CUSTOM_STYLE_ID,
    label: "Özel Tarz",
    group: "custom",
    hint: "Follow the user's custom style instruction closely.",
  },
  {
    id: "turk-halk",
    label: "Türk Halk Müziği",
    group: "turkiye",
    hint: "Anatolian Turkish folk: bağlama/saz as the lead, modal makam colour, earthy village timbre, sparse percussion, traditional folk vocal ornament if vocals are used.",
  },
  {
    id: "bozlak",
    label: "Bozlak",
    group: "turkiye",
    hint: "Bozlak long-air Anatolian folk: heavy bağlama, free or very slow pulse, raw yanık male folk vocal, lamenting melisma, no pop drums or synths.",
  },
  {
    id: "kirsehir-bozlagi",
    label: "Kırşehir Bozlağı",
    group: "turkiye",
    hint: "Kırşehir bozlağı: powerful bağlama/saz, slow heavy tempo, burning yanık male vocal, Central Anatolian long-air folk, dry room, no Western pop arrangement.",
  },
  {
    id: "uzun-hava",
    label: "Uzun Hava",
    group: "turkiye",
    hint: "Uzun hava: unmetered or loosely metered Turkish long-air folk, expressive bağlama, spacious silence between phrases, ornamental vocal, no dance beat.",
  },
  {
    id: "baglama",
    label: "Bağlama / Saz ağırlıklı",
    group: "turkiye",
    hint: "Bağlama/saz-led arrangement: the plucked lute is the main voice, sympathetic drone, Anatolian folk colour, other instruments stay behind the saz.",
  },
  {
    id: "turk-sanat",
    label: "Türk Sanat Müziği",
    group: "turkiye",
    hint: "Turkish classical art music (Türk sanat müziği): ud, kanun, ney, classical makam melody, elegant urban timbre, measured teslim phrases, refined vocal if used.",
  },
  {
    id: "arabesk",
    label: "Arabesk",
    group: "turkiye",
    hint: "Turkish arabesk: emotional string pads, bağlama and violin, dramatic melancholy, slow-to-mid tempo, passionate vocal ornament, 1970s–90s Turkish arabesk colour.",
  },
  {
    id: "ilahi",
    label: "İlahi",
    group: "turkiye",
    hint: "Turkish ilahi: reverent spiritual hymn, modest tempo, choir or soft male vocal if vocals, frame drum and modest melody, no club beat, no rap.",
  },
  {
    id: "tasavvuf",
    label: "Tasavvuf Müziği",
    group: "turkiye",
    hint: "Sufi / tasavvuf atmosphere: ney and bendir, meditative slow pulse, spiritual stillness, soft male vocal if vocals, no EDM, no rap, no cinematic trailer hits.",
  },
  {
    id: "ney",
    label: "Ney ağırlıklı",
    group: "turkiye",
    hint: "Ney-led piece: breathy reed flute as the main instrument, sparse bendir or silence, modal makam phrases, intimate room reverb.",
  },
  {
    id: "kaval",
    label: "Kaval ağırlıklı",
    group: "turkiye",
    hint: "Kaval-led Anatolian folk: end-blown shepherd flute as the lead, pastoral open-air colour, light bağlama support, no synth bass.",
  },
  {
    id: "davul-zurna",
    label: "Davul-Zurna",
    group: "turkiye",
    hint: "Davul-zurna wedding/procession folk: piercing zurna, fat davul drum, outdoor festival energy, dance pulse, raw village brass-reed colour.",
  },
  {
    id: "oyun-havasi",
    label: "Oyun Havası",
    group: "turkiye",
    hint: "Turkish oyun havası dance tune: lively folk dance groove, zurna or clarinet, davul or darbuka, festive wedding-floor energy.",
  },
  {
    id: "anadolu-rock",
    label: "Anadolu Rock",
    group: "turkiye",
    hint: "Anadolu rock: 1970s Anatolian psych-rock, electric guitar plus bağlama, organ, driving but folk-coloured groove, Turkish rock vocal if used.",
  },
  {
    id: "ozgun",
    label: "Özgün Müzik",
    group: "turkiye",
    hint: "Turkish özgün müzik: acoustic bağlama and guitar, poetic protest-folk, mid tempo, sincere male or mixed vocal i
... 