import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { requireAdmin } from "@/lib/zunoza/owner";

export const WELCOME_RESET_EVENT = "zunoza:welcome-reset";

const EXEMPT_PATHS = new Set([
  "/login",
  "/kullanim-kosullari",
  "/gizlilik",
  "/cerez-politikasi",
  "/teslimat-iade",
  "/kvkk-aydinlatma",
  "/on-bilgilendirme",
  "/mesafeli-satis",
  "/hakkimizda",
  "/iletisim",
  "/iptal-iade",
]);

export function isWelcomeExemptPath(pathname: string) {
  return EXEMPT_PATHS.has(pathname);
}

export function shouldShowWelcome(opts: {
  signedIn: boolean;
  pending: boolean;
  dismissed: boolean;
  pathname: string;
}) {
  if (!opts.signedIn || !opts.pending || opts.dismissed) return false;
  if (isWelcomeExemptPath(opts.pathname)) return false;
  return true;
}

export const stampWelcomeSeen = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    await sql`
      insert into zunoza_profiles (user_id, welcome_seen_at, welcome_pending)
      values (${context.userId}, now(), ${false})
      on conflict (user_id) do update
        set welcome_seen_at = coalesce(zunoza_profiles.welcome_seen_at, now()),
            welcome_pending = false
    `;
    return { ok: true as const };
  });

export const resetWelcomeScreen = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    await requireAdmin(sql, context.userId);
    await sql`
      update zunoza_profiles
      set welcome_seen_at = null, welcome_pending = true
      where user_id = ${context.userId}
    `;
    return { ok: true as const };
  });
