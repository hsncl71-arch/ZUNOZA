import { getSql } from "@/lib/db";
import { isOwnerEmail } from "@/lib/zunoza/owner-email";

export { OWNER_EMAIL, isOwnerEmail, isCanonicalOwnerEmail, normalizeEmail } from "@/lib/zunoza/owner-email";

export async function isOwnerUser(
  sql: Awaited<ReturnType<typeof getSql>>,
  userId: string,
) {
  if (!userId.trim()) return false;
  const [authUser] = await sql<{ email: string | null }>`
    select email from "user" where id = ${userId}
  `;
  if (isOwnerEmail(authUser?.email)) return true;
  const [profile] = await sql<{ email: string | null }>`
    select email from zunoza_profiles where user_id = ${userId}
  `;
  return isOwnerEmail(profile?.email);
}

export async function isUnlimitedUser(
  sql: Awaited<ReturnType<typeof getSql>>,
  userId: string,
) {
  if (await isOwnerUser(sql, userId)) return true;
  if (!userId.trim()) return false;
  const [row] = await sql<{ is_admin: boolean }>`
    select is_admin from zunoza_profiles where user_id = ${userId}
  `;
  return Boolean(row?.is_admin);
}

export async function requireOwner(
  sql: Awaited<ReturnType<typeof getSql>>,
  userId: string,
) {
  if (!(await isOwnerUser(sql, userId))) {
    throw new Error("Bu işlem yalnızca OWNER hesabına açıktır.");
  }
}

export async function requireAdmin(
  sql: Awaited<ReturnType<typeof getSql>>,
  userId: string,
) {
  if (await isOwnerUser(sql, userId)) return;
  const [profile] = await sql<{ is_admin: boolean }>`
    select is_admin from zunoza_profiles where user_id = ${userId}
  `;
  if (!profile?.is_admin) throw new Error("Yönetici değilsiniz.");
}
