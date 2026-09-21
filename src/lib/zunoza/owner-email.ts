export const OWNER_EMAIL = "zunozaofficial@gmail.com";
const OWNER_EMAILS = new Set([OWNER_EMAIL]);

export function normalizeEmail(email: string | null | undefined) {
  return (email ?? "").trim().toLowerCase();
}

/** Official Gmail stays Google-only. Extra env owners may use password signup. */
export function isCanonicalOwnerEmail(email: string | null | undefined) {
  return Boolean(normalizeEmail(email)) && normalizeEmail(email) === OWNER_EMAIL;
}

export function isOwnerEmail(email: string | null | undefined) {
  const extra = (process.env.ZUNOZA_OWNER_EMAILS ?? "")
    .split(",")
    .map((item) => normalizeEmail(item))
    .filter((item) => item.includes("@"));
  const allowed = new Set([...OWNER_EMAILS, ...extra]);
  const value = normalizeEmail(email);
  return Boolean(value) && allowed.has(value);
}
