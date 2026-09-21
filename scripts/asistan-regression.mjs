import { createJiti } from "jiti";
import { fileURLToPath } from "node:url";

const jiti = createJiti(import.meta.url, {
  alias: { "@": fileURLToPath(new URL("../src", import.meta.url)) },
});

const { assistantSseResponse } = await jiti.import("../src/lib/zunoza/assistant-stream.server.ts");
const { getSql } = await jiti.import("../src/lib/db.ts");
const { applyMemoryUtterance } = await jiti.import("../src/lib/zunoza/memory.ts");

async function readSse(res) {
  const text = await res.text();
  const events = [];
  for (const chunk of text.split("\n\n")) {
    const line = chunk.trim();
    if (!line.startsWith("data:")) continue;
    events.push(JSON.parse(line.slice(5).trim()));
  }
  const done = [...events].reverse().find((e) => e.t === "done");
  const err = events.find((e) => e.t === "error");
  return { status: res.status, events, reply: done?.reply?.reply || "", error: err?.message || null };
}

async function ask(text, userId = "reg-user") {
  const res = await assistantSseResponse({
    messages: [{ role: "user", content: text }],
    nowIso: new Date().toISOString(),
    timeZone: "Europe/Istanbul",
    userId,
  });
  return readSse(res);
}

const results = {};
try {
  results.hello = await ask("Merhaba");
  results.math = await ask("2+2 kaç?");
  results.iphone = await ask("iPhone 17 Pro Max fiyatı ne kadar?");
  const sql = await getSql();
  const uid = "reg-mem-" + Date.now();
  results.remember = await applyMemoryUtterance(
    sql,
    uid,
    "Ben Hasan Öcal'ım, bunu kalıcı olarak hatırla.",
  );
  results.who = await applyMemoryUtterance(sql, uid, "Ben kimim?");
  results.whoAsk = await ask("Ben kimim?", uid);
} catch (err) {
  console.log("FLOW_CRASH", err instanceof Error ? err.stack || err.message : err);
  process.exit(1);
}

for (const [k, v] of Object.entries(results)) {
  if (typeof v === "string" || v == null) {
    console.log(k, JSON.stringify(v));
    continue;
  }
  console.log(
    k,
    JSON.stringify({
      error: v.error,
      reply: String(v.reply || "").slice(0, 220),
      nEvents: v.events?.length,
    }),
  );
}
