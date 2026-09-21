export function friendlyClientError(err: unknown, fallback = "Asistan yanıt veremedi.") {
  const msg = err instanceof Error ? err.message : String(err || "");
  if (/401|unauthorized/i.test(msg)) return "Oturumunuz sona erdi. Lütfen tekrar giriş yapın.";
  if (/generation failed/i.test(msg) || /Proje oluşturulurken|İnşa/i.test(fallback)) {
    if (/status\s*5\d\d|generation failed|internal server|yanıt vermedi \(\d+\)/i.test(msg)) {
      return "Proje oluşturulurken bir sorun oluştu. Mevcut çalışmanız korundu. Tekrar deneyebilirsiniz.";
    }
  }
  if (/status\s*5\d\d|internal server|yanıt vermedi \(\d+\)/i.test(msg)) {
    return fallback || "Servis geçici olarak yanıt vermedi. Lütfen tekrar deneyin.";
  }
  if (
    /load failed|failed to fetch|fetch failed|networkerror|network request failed|aborted|timeout|timed out|connection|econnreset|enotfound/i.test(
      msg,
    )
  ) {
    return "Bağlantı kesildi. Lütfen tekrar deneyin.";
  }
  const cleaned = msg.replace(/\\n/g, " ").replace(/\s+/g, " ").trim();
  return cleaned || fallback;
}

export function hushRantReply(text: string, rant: boolean) {
  if (!rant) return text;
  if (/düzeltiyorum|kaydettim|not aldım|hatırlayacağım|hafızaya|yanlış hatırlad/i.test(text)) {
    return "Anladım.";
  }
  return text;
}
