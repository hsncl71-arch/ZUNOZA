/** Native auth uses the same Better Auth backend. No-ops on web. */

export const NATIVE_AUTH_SESSION = "http-only-cookie";
export const NATIVE_AUTH_BACKEND = "/api/auth";
export const NATIVE_USER_MARKER = "zunoza.nativeUser";

export const NATIVE_USER_SCOPED = [
  "profile",
  "credits",
  "projects",
  "videos",
  "ask-conversation",
  "memories",
] as const;

export const NATIVE_SECRET_PATTERNS = [
  /XAI_API_KEY/,
  /BETTER_AUTH_SECRET/,
  /IYZICO_SECRET/,
  /IYZICO_API/,
  /\bsk-[A-Za-z0-9]{10,}/,
];

export function isolateNativeUserCache(
  nextUserId: string | null,
  storage: { getItem(key: string): string | null; setItem(key: string, value: string): void; removeItem(key: string): void },
) {
  const prev = storage.getItem(NATIVE_USER_MARKER) || "";
  const next = nextUserId || "";
  const switched = Boolean(prev && prev !== next);
  if (next) storage.setItem(NATIVE_USER_MARKER, next);
  else storage.removeItem(NATIVE_USER_MARKER);
  return { switched, prev, next };
}

export function nativeAuthHasEmbeddedSecret(text: string) {
  return NATIVE_SECRET_PATTERNS.some((re) => re.test(text));
}
