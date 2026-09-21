#!/usr/bin/env node
/**
 * Measures xAI grok-voice first-audio latency for a simple greeting.
 * Not part of npm test — uses the live provider.
 */
const MODEL = "grok-voice-latest";
const WS_URL = `wss://api.x.ai/v1/realtime?model=${MODEL}`;
const PROMPT = "Merhaba, nasılsın?";

async function clientSecret(apiKey) {
  const res = await fetch("https://api.x.ai/v1/realtime/client_secrets", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ expires_after: { seconds: 120 }, model: MODEL }),
    signal: AbortSignal.timeout(15_000),
  });
  const json = await res.json();
  if (!res.ok || !json.value) throw new Error(json.error?.message || json.message || `secret ${res.status}`);
  return json.value;
}

function sessionBody(effort) {
  return {
    type: "session.update",
    session: {
      voice: "Sal",
      reasoning: { effort },
      tools: [{ type: "web_search" }],
      instructions:
        "Sen ZUNOZA AI’sın. Türkçe, kısa, sıcak erkek sesiyle konuş. Sessiz düşünme. Sıradan sohbette arama yapma. Cevaba hemen başla.",
      turn_detection: {
        type: "server_vad",
        threshold: 0.55,
        prefix_padding_ms: 80,
        silence_duration_ms: 280,
        create_response: true,
        interrupt_response: true,
      },
      audio: {
        input: { format: { type: "audio/pcm", rate: 24000 }, transcription: { language_hint: "tr" } },
        output: { format: { type: "audio/pcm", rate: 24000 } },
      },
    },
  };
}

function measure(apiKey, secret, effort) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(WS_URL, [`xai-client-secret.${secret}`]);
    const marks = { open: 0, updated: 0, created: 0, firstAudio: 0, done: 0, error: null };
    const t0 = Date.now();
    const timer = setTimeout(() => {
      try {
        ws.close();
      } catch {
        /* ignore */
      }
      reject(new Error(`timeout effort=${effort}`));
    }, 25_000);
    const finish = (err) => {
      clearTimeout(timer);
      try {
        ws.close();
      } catch {
        /* ignore */
      }
      if (err) reject(err);
      else {
        resolve({
          effort,
          wsOpenMs: marks.open,
          sessionUpdatedMs: marks.updated,
          responseCreatedMs: marks.created,
          firstAudioMs: marks.firstAudio,
          doneMs: marks.done,
          error: marks.error,
        });
      }
    };
    ws.addEventListener("open", () => {
      marks.open = Date.now() - t0;
      ws.send(JSON.stringify(sessionBody(effort)));
    });
    ws.addEventListener("message", (ev) => {
      let msg;
      try {
        msg = JSON.parse(String(ev.data));
      } catch {
        return;
      }
      const type = String(msg.type || "");
      if (type === "error") {
        marks.error = msg.error?.message || "error";
        if (/cancellation failed|no active response/i.test(marks.error)) return;
        finish(new Error(marks.error));
        return;
      }
      if ((type === "session.updated" || type === "session.created") && !marks.updated) {
        marks.updated = Date.now() - t0;
        ws.send(
          JSON.stringify({
            type: "conversation.item.create",
            item: { type: "message", role: "user", content: [{ type: "input_text", text: PROMPT }] },
          }),
        );
        ws.send(JSON.stringify({ type: "response.create" }));
      }
      if (type === "response.created" && !marks.created) marks.created = Date.now() - t0;
      if (
        (type === "response.output_audio.delta" || type === "response.audio.delta") &&
        !marks.firstAudio
      ) {
        marks.firstAudio = Date.now() - t0;
      }
      if (type === "response.done") {
        marks.done = Date.now() - t0;
        finish();
      }
    });
    ws.addEventListener("error", () => finish(new Error("ws error")));
  });
}

function pcmChunk(seconds, amplitude) {
  const n = Math.floor(24000 * seconds);
  const samples = new Int16Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / 24000;
    const env = amplitude * Math.min(1, i / 240, (n - i) / 240);
    const s = env * (0.55 * Math.sin(2 * Math.PI * 180 * t) + 0.35 * Math.sin(2 * Math.PI * 420 * t));
    samples[i] = Math.max(-32767, Math.min(32767, Math.round(s * 32767)));
  }
  return Buffer.from(samples.buffer).toString("base64");
}

function measureAudio(secret, effort) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(WS_URL, [`xai-client-secret.${secret}`]);
    const marks = {
      open: 0,
      updated: 0,
      speechStart: 0,
      speechStop: 0,
      transcript: 0,
      created: 0,
      firstAudio: 0,
      done: 0,
      error: null,
    };
    const t0 = Date.now();
    const timer = setTimeout(() => {
      try {
        ws.close();
      } catch {
        /* ignore */
      }
      reject(new Error(`audio timeout effort=${effort}`));
    }, 25_000);
    const finish = (err) => {
      clearTimeout(timer);
      try {
        ws.close();
      } catch {
        /* ignore */
      }
      if (err) reject(err);
      else {
        resolve({
          effort,
          speechToFirstAudioMs:
            marks.firstAudio && marks.speechStop ? marks.firstAudio - marks.speechStop : null,
          firstAudioMs: marks.firstAudio,
          speechStartMs: marks.speechStart,
          speechStopMs: marks.speechStop,
          transcriptMs: marks.transcript,
          responseCreatedMs: marks.created,
          doneMs: marks.done,
          error: marks.error,
        });
      }
    };
    ws.addEventListener("open", () => {
      marks.open = Date.now() - t0;
      ws.send(JSON.stringify(sessionBody(effort)));
    });
    ws.addEventListener("message", (ev) => {
      let msg;
      try {
        msg = JSON.parse(String(ev.data));
      } catch {
        return;
      }
      const type = String(msg.type || "");
      if (type === "error") {
        marks.error = msg.error?.message || "error";
        if (/cancellation failed|no active response/i.test(marks.error)) return;
        finish(new Error(marks.error));
        return;
      }
      if ((type === "session.updated" || type === "session.created") && !marks.updated) {
        marks.updated = Date.now() - t0;
        ws.send(JSON.stringify({ type: "input_audio_buffer.append", audio: pcmChunk(0.9, 0.35) }));
        ws.send(JSON.stringify({ type: "input_audio_buffer.append", audio: pcmChunk(0.45, 0) }));
      }
      if (type === "input_audio_buffer.speech_started" && !marks.speechStart) marks.speechStart = Date.now() - t0;
      if (type === "input_audio_buffer.speech_stopped" && !marks.speechStop) marks.speechStop = Date.now() - t0;
      if (type.includes("transcription") && !marks.transcript) marks.transcript = Date.now() - t0;
      if (type === "response.created" && !marks.created) marks.created = Date.now() - t0;
      if (
        (type === "response.output_audio.delta" || type === "response.audio.delta") &&
        !marks.firstAudio
      ) {
        marks.firstAudio = Date.now() - t0;
      }
      if (type === "response.done") {
        marks.done = Date.now() - t0;
        finish();
      }
    });
    ws.addEventListener("error", () => finish(new Error("ws error")));
  });
}
  const apiKey = (process.env.XAI_API_KEY || "").trim();
  if (!apiKey) {
    console.log(JSON.stringify({ skipped: true, reason: "no XAI_API_KEY
... 