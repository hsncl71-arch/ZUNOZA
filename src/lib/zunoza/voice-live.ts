import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { latestConsentGranted, recordConsent } from "@/lib/zunoza/privacy";
import { assertAiRateLimit, logAiUsage } from "@/lib/zunoza/ai-usage";
import { assertSpendCap } from "@/lib/zunoza/cost-cap";
import { estimateVoiceLiveUsd } from "@/lib/zunoza/provider-cost";
import { assertFreeTierAllows, assertNotDuplicate, chargeCredits, refundCredits, readFeatureCreditMap } from "@/lib/zunoza/credits";
import { VOICE_LIVE_RESERVE_MINUTES, voiceLiveCredits } from "@/lib/zunoza/credit-economy";

const REALTIME_MODEL = "grok-voice-latest";
const WS_URL = `wss://api.x.ai/v1/realtime?model=${REALTIME_MODEL}`;

export const createVoiceLiveSession = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input?: { consent?: boolean }) => input || {})
  .handler(async ({ context }) => {
    const apiKey = process.env.XAI_API_KEY?.trim();
    if (!apiKey) throw new Error("Canlı ses bu ortamda bağlı değil.");
    const estUsd = estimateVoiceLiveUsd(VOICE_LIVE_RESERVE_MINUTES);
    const rateP = assertAiRateLimit(context.userId, "voice_live", 10);
    const sqlP = getSql();
    const catalogP = readFeatureCreditMap();
    const capP = assertSpendCap(estUsd, { userId: context.userId, kind: "voice_live" });
    const sql = await sqlP;
    const [catalog, already] = await Promise.all([
      catalogP,
      latestConsentGranted(sql, context.userId, "microphone_live"),
      capP,
      assertFreeTierAllows(sql, context.userId, { feature: "voice_live" }),
      rateP,
    ]).then((rows) => [rows[0], rows[1]] as const);
    if (!already) {
      await recordConsent(sql, context.userId, "microphone_live", true, "canli-konus");
    }
    const jobId = crypto.randomUUID();
    const credits = voiceLiveCredits(catalog);
    const since = new Date(Date.now() - VOICE_LIVE_RESERVE_MINUTES * 60_000);
    const [reserved] = await sql<{ job_id: string }>`
      select c.job_id
      from credit_ledger c
      where c.user_id = ${context.userId}
        and c.kind = ${"sesli"}
        and c.amount < 0
        and c.created_at > ${since.toISOString()}
        and not exists (
          select 1 from credit_ledger r
          where r.job_id = c.job_id and r.kind = ${"iade"}
        )
      order by c.created_at desc
      limit 1
    `;
    assertNotDuplicate(context.userId, "voice_live", reserved ? 20_000 : 4_000);
    const chargeThisSession = !reserved;
    let billed = { charged: 0, unlimited: false, already: false };
    if (chargeThisSession) {
      billed = await chargeCredits(sql, {
        userId: context.userId,
        jobId,
        kind: "sesli",
        amount: credits,
        note: `Canlı konuşma ${VOICE_LIVE_RESERVE_MINUTES} dk rezerv`,
      });
    }
    try {
    const res = await fetch("https://api.x.ai/v1/realtime/client_secrets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        expires_after: { seconds: 600 },
        model: REALTIME_MODEL,
      }),
      signal: AbortSignal.timeout(15_000),
    });
    const json = (await res.json().catch(() => ({}))) as {
      value?: string;
      expires_at?: number;
      error?: { message?: string };
      message?: string;
    };
    if (!res.ok || !json.value) {
      throw new Error(json.error?.message || json.message || "Canlı ses oturumu açılamadı.");
    }
    void logAiUsage({
      userId: context.userId,
      kind: "voice_live",
      model: REALTIME_MODEL,
      meta: chargeThisSession ? "session 10m reserved" : "session reconnect",
      estimatedCostUsd: estUsd,
      creditsCharged: billed.unlimited || !chargeThisSession ? 0 : credits,
      jobId,
      unlimited: billed.unlimited,
    });
    return {
      clientSecret: json.value,
      expiresAt: json.expires_at ?? Math.floor(Date.now() / 1000) + 600,
      wsUrl: WS_URL,
      model: REALTIME_MODEL,
    };
    } catch (err) {
      if (chargeThisSession) {
        await refundCredits(sql, { userId: context.userId, jobId, amount: credits, note: "Canlı konuşma iadesi" });
      }
      throw err;
    }
  });
