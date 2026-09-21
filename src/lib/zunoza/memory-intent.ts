export type MemoryFact = { id: string; content: string; createdAt: string };

const ABUSE =
  /gerizekal[ıi]|gerzek|salak|aptal|ahmak|embesil|\bmal\b|gerizeka|orospu|kahpe|siktir|\bamk\b|\baq\b|oç\b|piç|pic\b|göt\b|ibne|gerizekalı|geri zekalı|geri zekali/i;

const SIDE_TALK =
  /sana demiyorum|sen sus\b|yanımdaki|yanimdaki|kardeşimle|kardesimle|eşimle|esimle|çocuğumla|cocugumla|müşteriyle|musteriyle|ona diyorum|onunla konuş|onunla konus|zunozaya demiyorum|sana söylemiyorum|seninle değil|seninle degil/i;

const NOT_NAME =
  /^(ben|sen|siz|bu|şu|su|o|ve|ile|çok|cok|az|daha|yine|lan|ya|hadi|hadı|tamam|tmm|yok|evet|hayır|hayir|gel|git|yap|dur|sus|aç|ac|tok|iyi|kötü|kotu|hazır|hazir|yorgun|üzgün|uzgun|kızgın|kizgin|salak|aptal|gerizekalı|gerizekali|mal|ahmak|ne|kim|neden|peki|pekii|ok|okay|olur|oldu|anladım|anladim|süper|super|harika|sağol|sagol|aynen|tabi|tabii|hmm+|hıhı|yes|yeah|sure|wow|nice|hadi)$/i;

const ACK_UTTERANCE =
  /^(peki|pekii+|tamam|tmm+|evet|hayır|hayir|yok|ok|okay|olur|oldu|anladım|anladim|süper|super|harika|sağol|sagol|teşekkür(?:ler)?|tesekkur(?:ler)?|aynen|tabii?|hmm+|hıhı|hı-hı|yes|yeah|yep|sure|right|alright|mhm|ha+|aa+|ee+|wow|nice)([!.\s]*)$/i;

export function stripMemoryCue(text: string) {
  return text
    .replace(
      /(?:[,.!]?\s*)(?:bunu|şunu|sunu)?\s*(?:lütfen|lutfen)?\s*(?:kalıcı olarak|kalici olarak|kalıcı|kalici)?\s*(?:hatırla|hatirla|kaydet|not\s*al|unutma|hafızaya\s+al|hafizaya\s+al)\s*[.!?]*$/gi,
      "",
    )
    .replace(/\s+/g, " ")
    .replace(/^[\s.,:;!-]+|[\s.,:;!-]+$/g, "")
    .trim();
}

export function isAckUtterance(text: string) {
  const n = text.toLocaleLowerCase("tr-TR").replace(/[?!.,;:]+/g, " ").replace(/\s+/g, " ").trim();
  if (!n || n.length > 24) return false;
  return ACK_UTTERANCE.test(n);
}

export function isForgetCommand(text: string) {
  const n = text.toLocaleLowerCase("tr-TR").replace(/\s+/g, " ").trim();
  if (!n) return false;
  if (/\bunutma\b/.test(n) && !/\bunut\b/.test(n.replace(/unutma/g, " "))) return false;
  return (
    /^(lütfen|lutfen)?\s*(bunu|şunu|sunu|bunları|şunları|sunlari)?\s*unut\b/.test(n) ||
    /\bunut\s+(bunu|şunu|sunu|bunları|şunları|bunu)\b/.test(n) ||
    n.includes("hafızadan sil") ||
    n.includes("hafizadan sil") ||
    n.includes("hafızandan sil") ||
    n.includes("hafizandan sil") ||
    n.includes("hafızanı sil") ||
    n.includes("hafizani sil") ||
    n.includes("hafızamı sil") ||
    n.includes("hafizami sil") ||
    n.includes("hafızadan çıkar") ||
    n.includes("hafizadan cikar") ||
    n.includes("hafızandan çıkar") ||
    n.includes("hafizandan cikar") ||
    n.includes("bunu hatırlama") ||
    n.includes("şunu hatırlama") ||
    n.includes("bunu hatirlama") ||
    n.includes("sunu hatirlama") ||
    n.includes("adımı unut") ||
    n.includes("adimi unut") ||
    n.includes("adımı sil") ||
    n.includes("adimi sil") ||
    n.includes("ismimi sil") ||
    n.includes("ismimi unut") ||
    n.includes("kaydı sil") ||
    n.includes("kaydi sil") ||
    n.includes("adı kaydını sil") ||
    n.includes("adi kaydini sil")
  );
}

export function isSensitiveMemory(text: string) {
  const n = `${text.toLocaleLowerCase("tr-TR")} ${text.toLowerCase()}`;
  if (
    n.includes("şifre") ||
    n.includes("sifre") ||
    n.includes("parola") ||
    n.includes("password") ||
    n.includes("api key") ||
    n.includes("api anahtar") ||
    n.includes("secret") ||
    n.includes("token") ||
    n.includes("cvv") ||
    n.includes("cvc") ||
    n.includes("iban") ||
    n.includes("kart no") ||
    n.includes("kredi kart") ||
    n.includes("tc kimlik") ||
    n.includes("t.c.") ||
    n.includes("tc no") ||
    n.includes("tckn") ||
    n.includes("seed phrase") ||
    n.includes("özel anahtar") ||
    n.includes("ozel anahtar") ||
    n.includes("private key") ||
    n.includes("recovery phrase")
  ) {
    return true;
  }
  if (/\b\d{13,19}\b/.test(n)) return true;
  if ((n.includes("kimlik") || /\btc\b/.test(n)) && /\b[1-9]\d{10}\b/.test(n)) return true;
  if (
    /[^\s@]+@[^\s@]+\.[^\s@]+/.test(text) &&
    (n.includes("mail") || n.includes("e-posta") || n.includes("eposta") || n.includes("email"))
  ) {
    return true;
  }
  const digits = n.replace(/\s+/g, "");
  if ((n.includes("telefon") || n.includes("numara") || n.includes("gsm")) && /\b0?5\d{9}\b/.test(digits)) {
    return true;
  }
  return false;
}

export function isAbusiveOrTransient(text: string) {
  const n = text.toLocaleLowerCase("tr-TR").trim();
  if (!n) return true;
  if (ABUSE.test(n)) return true;
  if (isSideTalk(text)) return true;
  if (/^(haha|hahaha|lol|kfj+|lan\b|ya lan)/i.test(n)) return true;
  if (n.length < 3) return true;
  return false;
}

export function isSideTalk(text: string) {
  return SIDE_TALK.test(text.toLocaleLowerCase("tr-TR"));
}

export function isIdentityCorrection(text: string) {
  const n = text.toLocaleLowerCase("tr-TR");
  const aboutName = n.includes("adım") || n.includes("adim") || n.includes("ismim") || n.includes("ismimi") || n.includes("adımı") || n.includes("adimi");
  return (
    n.includes("yanlış kaydet") ||
    n.includes("yanlis kaydet") ||
    n.includes("yanlış hatır") ||
    n.includes("yanlis hatir") ||
    (aboutName && (n.includes("düzelt") || n.includes("duzelt") || n.includes("değiştir") || n.includes("degistir"))) ||
    (aboutName && (n.includes("değil") || n.includes("degil")) && (n.includes("hatırla") || n.includes("hatirla") || n.includes("kaydet") || n.includes("düzelt") || n.includes("duzelt")))
  );
}

export function isMemoryConfirmQuestion(text: string) {
  const n = text.toLocaleLowerCase("tr-TR");
  return (
    n.includes("kaydettin mi") ||
    n.includes("hatırlayacak mısın") ||
    n.includes("hatirlayacak misin") ||
    n.includes("hatırlıyor musun") ||
    n.includes("hatirliyor musun") ||
    n.includes("aklında mı") ||
    n.includes("aklinda mi") ||
    n.includes("unutmayacak mısın") ||
    n.includes("bunu kaydettin") ||
    n.includes("hafızanda mı") ||
    n.includes("hafizanda mi")
  );
}

function hasExplicitRememberCue(n: string) {
  if (n.includes("hatırlat")) return false;
  const remember = /(?:^|[^\p{L}])(?:hatırla|hatirla)(?!d[ıi]|t)/u.test(n);
  const save = /(?:^|[^\p{L}])(?:kaydet|not\s*al|unutma)(?:[^\p{L}]|$)/u.test(n);
  const durable = n.includes("kalıcı olarak") || n.includes("kalici olarak") || n.includes("hafızaya al") || n.includes("hafizaya al");
  return remember || save || durable;
}

export function isNameLike(name: string) {
  const cleaned = cleanPersonName(name).replace(/\s+/g, " ").trim();
  if (cleaned.length < 2 || cleaned.length > 50) return false;
  if (ABUSE.test(cleaned)) return false;
  if (isAckUtterance(cleaned)) return false;
  if (!/^[\p{L}][\p{L}\s''’.-]*$/u.test(cleaned)) return false;
  const parts = cleaned.split(" ").filter(Boolean);
  if (parts.length < 1 || parts.length > 5) return false;
  if (parts.some((p) => NOT_NAME.test(p) || p.length < 2 || ACK_UTTERANCE.test(p))) return false;
  if (parts.length === 1 && /(?:dim|dım|dum|düm|tim|tım|tum|tüm|yorum|yorsun)$/i.test(parts[0])) return false;
  return true;
}

export function isExplicitNameSave(text: string) {
  const n = text.toLocaleLowerCase("tr-TR").replace(/\s+/g, " ").trim();
  if (!n || isAckUtterance(n) || isForgetCommand(n) || isAbusiveOrTransient(n) || isIdentityQuestion(text)) return false;
  if (looksLikeFounderAsk(n)) return false;
  return (
    /(?:benim\s+)?(?:ad[ıi]m|ismim)\s+[\p{L}]/u.test(n) ||
    /beni\s+[\p{L}][\s\p{L}'’.-]{1,40}?\s+olarak\s+(?:hatırla|hatirla|kaydet)/u.test(n) ||
    /(?:ad[ıi]m[ıi]|ismimi)\s+[\p{L}].{0,48}?(?:olarak\s+)?(?:kaydet|hatırla|hatirla|düzelt|duzelt)/u.test(n) ||
    /^ben\s+[\p{L}][\p{L}'’.-]+(?:\s+[\p{L}][\p{L}'’.-]+){1,3}(?:['’]?(?:yım|yim|ım|im))\b/u.test(n)
  );
}

function looksLikeFounderAsk(n: string) {
  if (n.includes("hasan öcal") || n.includes("hasan ocal")) {
    return /kimdir|kurucu|nereli|hakkında|hakkinda|vizyon|tespih|tesbih|who is|founder|sahibi/.test(n);
  }
  return /zunoza/.test(n) && /kurucu|sahibi kim|kim kurdu|kim yaptı|kim yapti/.test(n);
}

export function looksLikeMemoryCommand(text: string) {
  const n = text.toLocaleLowerCase("tr-TR");
  if (isIdentityQuestion(text) || isCompanyQuestion(text) || isAboutMeQuestion(text) || isMemo
... 