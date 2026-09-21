type SpeechRec = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((ev: { results: ArrayLike<{ isFinal?: boolean; 0: { transcript: string } }> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
};

function SpeechCtor() {
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRec;
    webkitSpeechRecognition?: new () => SpeechRec;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export function dictationSupported() {
  return Boolean(SpeechCtor());
}

export function startDictation(onFinal: (text: string) => void, onStop?: () => void) {
  const Ctor = SpeechCtor();
  if (!Ctor) return () => undefined;
  const rec = new Ctor();
  rec.lang = "tr-TR";
  rec.continuous = true;
  rec.interimResults = false;
  rec.onresult = (ev) => {
    const last = ev.results[ev.results.length - 1];
    const text = last?.[0]?.transcript?.trim();
    if (text) onFinal(text);
  };
  rec.onend = () => onStop?.();
  rec.onerror = () => onStop?.();
  rec.start();
  return () => {
    try {
      rec.stop();
    } catch {
      /* ignore */
    }
  };
}
