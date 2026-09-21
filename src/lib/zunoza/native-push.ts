/** Native push. Sends nothing until APNs/FCM credentials exist on the server. */

import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";

export const NATIVE_PUSH_READY = Boolean(
  process.env.APNS_KEY_ID && process.env.APNS_TEAM_ID && process.env.FCM_SERVER_KEY,
);

export const NATIVE_PUSH_WAITING =
  "Push bildirimi APNs anahtarı ve FCM sunucu anahtarı sunucuya eklenince açılır. Uygulama içinde credential yok.";

async function ensurePushTable(sql: Awaited<ReturnType<typeof getSql>>) {
  await sql`
    create table if not exists native_push_tokens (
      id text primary key,
      user_id text not null,
      platform text not null,
      token text not null unique,
      updated_at timestamptz not null default now()
    )
  `;
}

export function pushCredentialsPresent() {
  const apns = Boolean(process.env.APNS_KEY_ID && process.env.APNS_TEAM_ID && process.env.APNS_P8);
  const fcm = Boolean(process.env.FCM_SERVER_KEY);
  return { apns, fcm, ready: apns || fcm };
}

export async function notifyVideoReady(userId: string, jobId: string) {
  const creds = pushCredentialsPresent();
  if (!creds.ready) return { sent: false as const, reason: "credentials" as const, jobId, userId };
  return { sent: false as const, reason: "credentials" as const, jobId, userId };
}

export const registerNativePushToken = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { token: string; platform: "ios" | "android" }) => input)
  .handler(async ({ context, data }) => {
    const token = data.token.trim().slice(0, 4096);
    if (token.length < 16) throw new Error("Bildirim jetonu geçersiz.");
    const sql = await getSql();
    await ensurePushTable(sql);
    await sql`
      insert into native_push_tokens (id, user_id, platform, token)
      values (${crypto.randomUUID()}, ${context.userId}, ${data.platform}, ${token})
      on conflict (token) do update set user_id = ${context.userId}, platform = ${data.platform}, updated_at = now()
    `;
    return { ok: true as const, ready: pushCredentialsPresent().ready };
  });
