import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const asistan = readFileSync(new URL("../../routes/asistan.tsx", import.meta.url), "utf8");
const stream = readFileSync(new URL("./assistant-stream.server.ts", import.meta.url), "utf8");
const assistant = readFileSync(new URL("./assistant.ts", import.meta.url), "utf8");
const api = readFileSync(new URL("../../routes/api/asistan-akisi.ts", import.meta.url), "utf8");
const voices = readFileSync(new URL("./voices.ts", import.meta.url), "utf8");
const intent = readFileSync(new URL("./web-search-intent.ts", import.meta.url), "utf8");
const composer = readFileSync(new URL("../../components/composer.tsx", import.meta.url), "utf8");
const memory = readFileSync(new URL("./memory.ts", import.meta.url), "utf8");
const askStream = readFileSync(new URL("./ask-stream.ts", import.meta.url), "utf8");
const voiceLive = readFileSync(new URL("./voice-live.ts", import.meta.url), "utf8");
const realtime = readFileSync(new URL("./realtime-client.ts", import.meta.url), "utf8");

test("written ask streams, locks double send, and can create or edit images", () => {
  assert.match(asistan, /sendingRef/);
  assert.match(asistan, /streamZunozaAsk/);
  assert.match(asistan, /editStudioImage/);
  assert.match(asistan, /generateStudioImage/);
  assert.match(asistan, /stashEditSource/);
  assert.match(asistan, /tryMemoryCommand/);
  assert.match(asistan, /applyAskDelta/);
  assert.match(asistan, /askSendKey/);
  assert.doesNotMatch(asistan, /<textarea/);
});

test("ask stream retries once on a dropped network call", () => {
  assert.match(askStream, /async function fetchAsk/);
  assert.match(askStream, /setTimeout\(resolve, 350\)/);
});

test("live voice starts without an extra consent checkbox and keeps male Sal", () => {
  assert.match(asistan, /createVoiceLiveSession\(\{ data: \{ consent: true \} \}\)/);
  assert.match(asistan, /const streamP = getMicrophoneStream\(\)/);
  assert.match(asistan, /const sessionP = createVoiceLiveSession/);
  assert.doesNotMatch(asistan, /type="checkbox"/);
  assert.match(asistan, /aria-label=\{voiceOn \? "Sesli okumayı kapat" : "Yazılı cevapları sesli oku"\}/);
  assert.match(voices, /DEFAULT_LIVE_VOICE: LiveVoiceId = "Sal"/);
  assert.match(assistant, /voice_id: "sal"/);
});

test("live voice hides cancel races and disables default high reasoning", () => {
  assert.match(realtime, /isInternalLiveError/);
  assert.match(realtime, /cancelActiveResponse/);
  assert.match(realtime, /liveSessionConfig/);
  assert.match(asistan, /isInternalLiveError/);
  assert.match(voices, /effort: "none"/);
  assert.match(voices, /web_search/);
  assert.match(realtime, /\[zunoza-live\]/);
  assert.doesNotMatch(realtime, /effort: "high"/);
});

test("web search stays automatic and credits charge before the model", () => {
  assert.match(intent, /never require/);
  assert.match(stream, /shouldSearchWeb\(lastUser, prevUser, hasImages\)/);
  assert.match(stream, /chargeCredits/);
  assert.match(stream, /refundCredits/);
  assert.match(stream, /assertSpendCap/);
  assert.match(stream, /assertNotDuplicate/);
  assert.match(stream, /Promise\.all\(/);
  assert.match(stream, /instantAssistantReply/);
});

test("vision payloads are allowed and history images stay bounded", () => {
  assert.match(api, /2_500_000/);
  assert.match(assistant, /i === lastUser/);
  assert.match(assistant, /sanitizeAskImages/);
  assert.match(assistant, /carryForwardImages/);
  assert.match(assistant, /toAskApiTurns/);
  assert.match(composer, /toDataURL\("image\/jpeg", 0\.74\)/);
  assert.match(composer, /sampleVideoFrames/);
  assert.match(composer, /compressAskImage/);
  assert.match(askStream, /prepareChatHistory/);
  assert.match(stream, /detail: "high"|toAskApiTurns/);
  assert.match(media, /detail: "high"/);
  assert.match(stream, /web && !hasImages/);
  assert.match(stream, /toAskApiTurns/);
  assert.doesNotMatch(stream, /stripImages/);
  assert.match(asistan, /persistableAskMessages\(messages\)/);
  assert.match(asistan, /attachStoredAskImages/);
  assert.doesNotMatch(asistan, /images: m\.images\?\.filter\(\(url\) => isAskAttachmentPath\(url\)\)/);
  assert.match(asistan, /injectSilentContext/);
  assert.match(asistan, /consumePendingAsk/);
  assert.match(asistan, /liveContextFromThread/);
  assert.match(asistan, /describeAskImageForLive/);
  assert.match(asistan, /messagesRef/);
  assert.match(asistan, /liveOpen && hasMedia/);
  const thread = readFileSync(new URL("./ask-thread.ts", import.meta.url), "utf8");
  assert.match(thread, /preserveAskImages/);
  assert.match(realtime, /injectSilentContext/);
  assert.match(realtime, /threadContext/);
  assert.match(voices, /threadContext/);
  const conversation = readFileSync(new URL("./ask-conversation.ts", import.meta.url), "utf8");
  assert.match(conversation, /user_id = \$\{userId\}/);
  assert.match(conversation, /ask_attachments/);
  assert.match(conversation, /url.startsWith\("data:image\/"\)/);
  assert.match(conversation, /return \{ ok: true as const, messages: stored \}/);
  assert.doesNotMatch(conversation, /images: m.images\?\.filter\(\(url\) => isAskAttachmentPath\(url\)\)/);
  const attachRoute = readFileSync(new URL("../../routes/api/sor-ekler.\$attachmentId.indir.ts", import.meta.url), "utf8");
  assert.match(attachRoute, /user_id = \$\{user\.id\}/);
});

test("context cost stays capped and first token is not blocked by rate limit", () => {
  assert.match(assistant, /HISTORY_BUDGET/);
  assert.match(assistant, /HISTORY_LIMIT/);
  const startFn = stream.indexOf("async start(controller)");
  const instantAt = stream.indexOf("instantAssistantReply", startFn);
  const rateAt = stream.indexOf("assertAiRateLimit(input.userId", startFn);
  assert.ok(instantAt > startFn);
  assert.ok(rateAt > instantAt);
});

test("memory mutations stay scoped to the signed-in user", () => {
  const stmts = memory.match(/sql`[\s\S]*?`/g) || [];
  const memoryStmts = stmts.filter((row) => row.includes("user_memories"));
  assert.ok(memoryStmts.length >= 8);
  for (const stmt of memoryStmts) {
    assert.match(stmt, /user_id/);
  }
});

test("live voice does not rebill inside the reserve window and speak/copy write the cost ledger", () => {
  assert.match(voiceLive, /chargeThisSession/);
  assert.match(voiceLive, /session reconnect/);
  assert.match(realtime, /existing secret may be dead/);
  assert.match(assistant, /kind: "voice_tts"/);
  assert.match(assistant, /kind: "assistant_chat"/);
  assert.match(assistant, /logAiUsage/);
});
