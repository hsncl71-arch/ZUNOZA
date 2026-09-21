const BASE = "http://127.0.0.1:8080";
const email = `mem${Date.now()}@zunoza.test`;
const password = process.env.ZUNOZA_E2E_PASSWORD || "test-password";

function parseSse(text) {
  const events = [];
  for (const chunk of text.split("\n\n")) {
    const line = chunk.trim();
    if (!line.startsWith("data:")) continue;
    try {
      events.push(JSON.parse(line.slice(5).trim()));
    } catch {
      /* ignore */
    }
  }
  const done = [...events].reverse().find((e) => e?.t === "done");
  const err = events.find((e) => e?.t === "error");
  const deltas = events.filter((e) => e?.t === "delta").map((e) => e.c);
  return {
    reply: String(done?.reply?.reply || ""),
    error: err?.message || null,
    firstDelta: deltas[0] || "",
    nEvents: events.length,
  };
}

async function signup() {
  const res = await fetch(`${BASE}/api/auth/sign-up/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: BASE },
    body: JSON.stringify({ email, password, name: "E2E User" }),
  });
  const token = res.headers.get("set-auth-token");
  const body = await res.text();
  if (!res.ok || !token) throw new Error(`signup ${res.status} ${body.slice(0, 200)}`);
  return token;
}

async function ask(token, text, extra = []) {
  const messages = [...extra, { role: "user", content: text }];
  const res = await fetch(`${BASE}/api/asistan-akisi`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      Origin: BASE,
      "Sec-Fetch-Site": "same-origin",
    },
    body: JSON.stringify({
      messages,
      nowIso: new Date().toISOString(),
      timeZone: "Europe/Istanbul",
    }),
  });
  const raw = await res.text();
  if (res.status === 401) return { status: 401, reply: "", error: "Unauthorized", firstDelta: "", nEvents: 0 };
  if (!res.ok) return { status: res.status, reply: "", error: raw.slice(0, 300), firstDelta: "", nEvents: 0 };
  return { status: res.status, ...parseSse(raw) };
}

function announced(text) {
  return /kaydettim|not aldım|hafızaya ekledim|hatırlayacağım/i.test(text);
}

const token = await signup();
const out = {};

out.save = await ask(token, "Ben Hasan Öcal'ım. Bunu hatırla.");
out.who1 = await ask(token, "Ben kimim?");
out.insult = await ask(token, "Gerizekalı, ne Hasan Öcal'ı?");
out.who2 = await ask(token, "Ben kimim?");
out.rant = await ask(token, "Salak, yine yanlış yaptın.");
out.who3 = await ask(token, "Ben kimim?");
out.side = await ask(token, "Sana demiyorum, yanımdakiyle konuşuyorum.");
out.who4 = await ask(token, "Ben kimim?");
out.company = await ask(token, "Şirketimin adı Öz Öcal Tesbihçilik. Bunu hatırla.");
out.companyQ = await ask(token, "Şirketimin adı ne?");
out.correct = await ask(token, "Benim adımı yanlış kaydetmişsin. Adım Ahmet Öcal. Bunu düzelt ve hatırla.");
out.whoAhmet = await ask(token, "Ben kimim?");
out.restore = await ask(token, "Benim adımı yanlış kaydetmişsin. Adım Hasan Öcal. Bunu düzelt ve hatırla.");
out.whoHasan = await ask(token, "Ben kimim?");

const chatter = ["Merhaba", "Nasılsın?", "2+2 kaç?", "Bana kısa bir şiir yaz", "Teşekkürler", "Sadece sohbet ediyoruz", "Video stüdyosu nedir?", "Tamam anladım", "Güzel", "Peki başka?"];
out.chat = [];
for (const line of chatter) {
  out.chat.push(await ask(token, line));
}

out.iphone = await ask(token, "iPhone 17 Pro Max fiyatı ne kadar?");

const report = {
  t1_save_no_kaydettim: !announced(out.save.reply),
  t1_save_ok: out.save.status === 200 && !out.save.error,
  t2_who: /hasan öcal/i.test(out.who1.reply) && !/gerizekal/i.test(out.who1.reply),
  t3_insult_kept_name: /hasan öcal/i.test(out.who2.reply) && !/gerizekal/i.test(out.who2.reply),
  t4_rant_kept_name: /hasan öcal/i.test(out.who3.reply) && !/salak/i.test(out.who3.reply),
  t7_side_kept_name: /hasan öcal/i.test(out.who4.reply),
  company: /öz öcal tesbihçilik/i.test(out.companyQ.reply),
  t5_correction: /ahmet öcal/i.test(out.whoAhmet.reply),
  restored: /hasan öcal/i.test(out.whoHasan.reply),
  t6_no_announce: out.chat.every((m) => m.status === 20
... 