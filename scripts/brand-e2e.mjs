const BASE = "http://127.0.0.1:8080";
const email = `brand${Date.now()}@zunoza.test`;
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
  return String(done?.reply?.reply || "");
}

async function signup() {
  const res = await fetch(`${BASE}/api/auth/sign-up/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: BASE },
    body: JSON.stringify({ email, password, name: "Brand User" }),
  });
  const token = res.headers.get("set-auth-token");
  if (!res.ok || !token) throw new Error(`signup ${res.status}`);
  return token;
}

async function ask(token, text) {
  const res = await fetch(`${BASE}/api/asistan-akisi`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      Origin: BASE,
      "Sec-Fetch-Site": "same-origin",
    },
    body: JSON.stringify({
      messages: [{ role: "user", content: text }],
      nowIso: new Date().toISOString(),
      timeZone: "Europe/Istanbul",
    }),
  });
  const raw = await res.text();
  if (!res.ok) throw new Error(`ask ${res.status} ${raw.slice(0, 180)}`);
  return parseSse(raw);
}

const tokenA = await signup();
const tokenB = await signupB();

async function signupB() {
  const res = await fetch(`${BASE}/api/auth/sign-up/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: BASE },
    body: JSON.stringify({ email: `other${Date.now()}@zunoza.test`, password, name: "Other User" }),
  });
  const token = res.headers.get("set-auth-token");
  if (!res.ok || !token) throw new Error(`signupB ${res.status}`);
  return token;
}

const out = {
  whoBuilt: await ask(tokenA, "Seni kim kurdu?"),
  founder: await ask(tokenA, "ZUNOZA'nın kurucusu kim?"),
  whoIs: await ask(tokenA, "Hasan Öcal kimdir?"),
  origin: await ask(tokenA, "Hasan Öcal nereli?"),
  otherWho: await ask(tokenB, "Ben kimim?"),
  otherFounder: await ask(tokenB, "ZUNOZA'nın kurucusu kim?"),
  iphone: await ask(tokenA, "iPhone 17 Pro Max fiyatı ne kadar?"),
};

const report = {
  whoBuilt: /^hasan öcal\.?$/i.test(out.whoBuilt.trim()),
  founder: /^hasan öcal\.?$/i.test(out.founder.trim()),
  whoIs: /kırıkkaleli bir iş insanıdır ve zunoza/i.test(out.whoIs),
  origin: /kırıkkaleli/i.test(out.origin) && !/sen hasan/i.test(out.origin),
  otherNotUserHasan: !/hasan öcal/i.test(out.otherWho),
  otherStillKnowsFounder: /hasan öcal/i.test(out.otherFounder),
  iphoneSearch: /tl|fiyat|kaynaklara/i.test(out.iphone),
  replies: out,
};
console.log(JSON.stringify(report, null, 2));
if (!report.whoBuilt || !report.founder || !report.whoIs || !report.origin || !report.otherNotUserHasan || !report.otherStillKnowsFounder || !report.iphoneSearch) {
  process.exit(1);
}
