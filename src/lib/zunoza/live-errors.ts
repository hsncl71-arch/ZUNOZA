export function isFatalLiveError(message: string) {
  return /unauthorized|unauthorised|forbidden|invalid api|client.secret|expired|notallowed|permission|izni|izin|mikrofon bulunamadı/i.test(
    message,
  );
}

/** Provider lifecycle noise — never show these to the user. */
export function isInternalLiveError(message: string) {
  return /cancellation failed|no active response|already cancelled|response not found|nothing to cancel|cancel.*not found|unknown item|conversation already/i.test(
    message,
  );
}

export type LiveTurnMetrics = {
  speechStartedAt: number | null;
  speechStoppedAt: number | null;
  transcriptAt: number | null;
  responseCreatedAt: number | null;
  firstAudioAt: number | null;
};

export function summarizeLiveTurn(m: LiveTurnMetrics) {
  const silenceToAudio =
    m.firstAudioAt && m.speechStoppedAt ? m.firstAudioAt - m.speechStoppedAt : null;
  const vadMs = m.speechStartedAt && m.speechStoppedAt ? m.speechStoppedAt - m.speechStartedAt : null;
  const sttAfterStop = m.transcriptAt && m.speechStoppedAt ? m.transcriptAt - m.speechStoppedAt : null;
  const modelToAudio =
    m.firstAudioAt && m.responseCreatedAt ? m.firstAudioAt - m.responseCreatedAt : null;
  return {
    vadMs,
    sttAfterStopMs: sttAfterStop,
    modelToAudioMs: modelToAudio,
    firstAudioAfterSilenceMs: silenceToAudio,
  };
}
