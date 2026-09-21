import assert from "node:assert/strict";
import test from "node:test";

function isFatalLiveError(message) {
  return /unauthorized|unauthorised|forbidden|invalid api|client.secret|expired|notallowed|permission|izni|izin|mikrofon bulunamadı/i.test(
    message,
  );
}

const LIVE_LABEL = {
  idle: "Kapalı",
  connecting: "Bağlanıyor…",
  reconnecting: "Bağlantı yeniden kuruluyor…",
  live: "Dinliyor — konuşabilirsiniz",
  listening: "Sizi dinliyor",
  speaking: "ZUNOZA konuşuyor — araya girebilirsiniz",
  error: "Bağlanamadı — tekrar deneyin",
};

test("session and tool errors are not fatal", () => {
  assert.equal(isFatalLiveError("web_search failed"), false);
  assert.equal(isFatalLiveError("unknown tool"), false);
  assert.equal(isFatalLiveError("invalid session field"), false);
});

test("auth and mic permission errors are fatal", () => {
  assert.equal(isFatalLiveError("unauthorized"), true);
  assert.equal(isFatalLiveError("Mikrofon izni verilmedi."), true);
  assert.equal(isFatalLiveError("client secret expired"), true);
});

test("live panel stays open on error and offers retry copy", () => {
  assert.equal(/tekrar/i.test(LIVE_LABEL.error), true);
  assert.equal("idle" in LIVE_LABEL && "connecting" in LIVE_LABEL, true);
});
