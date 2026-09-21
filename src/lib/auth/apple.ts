/**
 * Direct Sign in with Apple (not the Grok broker).
 * Callback path is the genericOAuth slot already registered at Apple:
 * /api/auth/oauth2/callback/grok-apple
 */
import { createPrivateKey, createSign } from "node:crypto";
import { decodeJwt } from "jose";

export const APPLE_PROVIDER_ID = "grok-apple";
export const APPLE_CALLBACK_PATH = "/api/auth/oauth2/callback/grok-apple";
export const APPLE_BUNDLE_ID = "com.zunoza.app";

const env = (key: string): string | undefined => {
  const value = process.env[key]?.trim();
  return value ? value : undefined;
};

export type AppleSecretInput = {
  APPLE_CLIENT_ID?: string;
  APPLE_SERVICE_ID?: string;
  APPLE_CLIENT_SECRET?: string;
  APPLE_TEAM_ID?: string;
  APPLE_KEY_ID?: string;
  APPLE_PRIVATE_KEY?: string;
};

export function appleClientId(source: AppleSecretInput = process.env): string | undefined {
  return source.APPLE_CLIENT_ID?.trim() || source.APPLE_SERVICE_ID?.trim() || undefined;
}

export function isAppleAuthConfigured(source: AppleSecretInput = process.env): boolean {
  if (!appleClientId(source)) return false;
  if (source.APPLE_CLIENT_SECRET?.trim()) return true;
  return Boolean(
    source.APPLE_TEAM_ID?.trim() && source.APPLE_KEY_ID?.trim() && source.APPLE_PRIVATE_KEY?.trim(),
  );
}

export function normalizeApplePrivateKey(raw: string): string {
  const trimmed = raw.trim().replace(/\\n/g, "\n").replace(/\r\n/g, "\n");
  if (trimmed.includes("BEGIN")) return trimmed;
  const body = trimmed.replace(/\s+/g, "");
  const lines = body.match(/.{1,64}/g)?.join("\n") ?? body;
  return `-----BEGIN PRIVATE KEY-----\n${lines}\n-----END PRIVATE KEY-----`;
}

export function createAppleClientSecret(input: {
  clientId: string;
  teamId: string;
  keyId: string;
  privateKey: string;
  now?: number;
}): string {
  const now = input.now ?? Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: "ES256", kid: input.keyId })).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({
      iss: input.teamId,
      iat: now,
      exp: now + 60 * 60 * 24 * 150,
      aud: "https://appleid.apple.com",
      sub: input.clientId,
    }),
  ).toString("base64url");
  const data = `${header}.${payload}`;
  const key = createPrivateKey(normalizeApplePrivateKey(input.privateKey));
  const sig = createSign("SHA256").update(data).sign({ key, dsaEncoding: "ieee-p1363" });
  return `${data}.${Buffer.from(sig).toString("base64url")}`;
}

export function resolveAppleClientSecret(source: AppleSecretInput = process.env): string | undefined {
  const ready = source.APPLE_CLIENT_SECRET?.trim();
  if (ready) return ready;
  const clientId = appleClientId(source);
  const teamId = source.APPLE_TEAM_ID?.trim();
  const keyId = source.APPLE_KEY_ID?.trim();
  const privateKey = source.APPLE_PRIVATE_KEY?.trim();
  if (!clientId || !teamId || !keyId || !privateKey) return undefined;
  return createAppleClientSecret({ clientId, teamId, keyId, privateKey });
}

export function appleGenericOAuthConfig(source: AppleSecretInput = process.env) {
  const clientId = appleClientId(source);
  const clientSecret = resolveAppleClientSecret(source);
  if (!clientId || !clientSecret) return null;
  return {
    providerId: APPLE_PROVIDER_ID,
    clientId,
    clientSecret,
    authorizationUrl: "https://appleid.apple.com/auth/authorize",
    tokenUrl: "https://appleid.apple.com/auth/token",
    scopes: ["name", "email"],
    pkce: true,
    responseMode: "form_post" as const,
    prompt: "login" as const,
    getUserInfo: async (tokens: { idToken?: string; user?: { name?: { firstName?: string; lastName?: string } } }) => {
      if (!tokens.idToken) return null;
      const profile = decodeJwt(tokens.idToken) as {
        sub?: string;
        email?: string;
        email_verified?: boolean | string;
      };
      if (!profile.sub) return null;
      const fromForm = tokens.user?.name
        ? `${tokens.user.name.firstName || ""} ${tokens.user.name.lastName || ""}`.trim()
        : "";
      const emailVerified = profile.email_verified === true || profile.e
... 