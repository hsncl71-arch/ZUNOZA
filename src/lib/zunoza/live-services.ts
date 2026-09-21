/** Presence + optional live pings. Never prints secrets. IAP stays closed. */

import { isAppleAuthConfigured } from "../auth/apple.ts";
import { STORE_BILLING_READY } from "./store-billing.ts";
import { STORE_ACCOUNT_TODOS } from "./store-verify.ts";

export type LiveServiceState = "calisiyor" | "eksik" | "stage" | "kapali" | "anahtar-var";

export type LiveServiceRow = {
  id: string;
  label: string;
  state: LiveServiceState;
  detail: string;
  needsKey: boolean;
  needsDevice: boolean;
};

type LiveEnv = Record<string, string | undefined>;

function has(source: LiveEnv, ...keys: string[]) {
  return keys.some((key) => Boolean(source[key]?.trim()));
}

function shotstackKey(source: LiveEnv) {
  return Boolean(source.SHOTSTACK_API_KEY?.trim());
}

function shotstackProd(source: LiveEnv) {
  if (!shotstackKey(source)) return false;
  const explicit = (source.SHOTSTACK_BASE_URL || "").trim().replace(/\/$/, "");
  if (explicit && /\/edit\/v1$/i.test(explicit) && !/stage/i.test(explicit)) return true;
  const envName = (source.SHOTSTACK_ENV || "").trim().toLowerCase();
  return envName === "v1" || envName === "prod" || envName === "production";
}

function iyzicoKeys(source: LiveEnv) {
  const api = has(source, "IYZICO_API_KEY", "IYZI_API_KEY", "IYZIPAY_API_KEY", "IYZICO_APIKEY");
  const secret = has(source, "IYZICO_SECRET_KEY", "IYZI_SECRET_KEY", "IYZIPAY_SECRET_KEY", "IYZICO_SECRET");
  return api && secret;
}

function iyzicoLooksSandbox(source: LiveEnv) {
  const key =
    source.IYZICO_API_KEY ||
    source.IYZI_API_KEY ||
    source.IYZIPAY_API_KEY ||
    source.IYZICO_APIKEY ||
    "";
  return /^sandbox[-_]/i.test(key.trim());
}

function r2Keys(source: LiveEnv) {
  return (
    has(source, "R2_ACCESS_KEY_ID", "MEDIA_S3_ACCESS_KEY_ID", "AWS_ACCESS_KEY_ID") &&
    has(source, "R2_SECRET_ACCESS_KEY", "MEDIA_S3_SECRET_ACCESS_KEY", "AWS_SECRET_ACCESS_KEY") &&
    has(source, "R2_ENDPOINT", "MEDIA_S3_ENDPOINT", "R2_ACCOUNT_ID", "CLOUDFLARE_ACCOUNT_ID")
  );
}

function appleIapKeys(source: LiveEnv) {
  return Boolean(
    source.APPLE_IAP_ISSUER_ID?.trim() && source.APPLE_IAP_KEY_ID?.trim() && source.APPLE_IAP_PRIVATE_KEY?.trim(),
  );
}

function googlePlayKeys(source: LiveEnv) {
  return Boolean(source.GOOGLE_PLAY_SERVICE_ACCOUNT?.trim());
}

export function inspectLiveServices(source: LiveEnv = process.env): LiveServiceRow[] {
  const xai = has(source, "XAI_API_KEY");
  const eleven = has(source, "ELEVENLABS_API_KEY", "ELEVEN_API_KEY");
  const r2 = r2Keys(source);
  const shotKey = shotstackKey(source);
  const shotProd = shotstackProd(source);
  const iyzico = iyzicoKeys(source);
  const iyzicoLive = iyzico && !iyzicoLooksSandbox(source);
  const neon = Boolean(source.DATABASE_URL?.trim());
  const apple = isAppleAuthConfigured(source);
  const google = has(source, "GROK_AUTH_CLIENT_ID") && has(source, "GROK_AUTH_CLIENT_SECRET");
  const appleIap = appleIapKeys(source);
  const play = googlePlayKeys(source);

  return [
    {
      id: "xai",
      label: "xAI",
      state: xai ? "anahtar-var" : "eksik",
      detail: xai ? "XAI_API_KEY tanımlı" : "XAI_API_KEY yok",
      needsKey: !xai,
      needsDevice: false,
    },
    {
      id: "elevenlabs",
      label: "ElevenLabs",
      state: eleven ? "anahtar-var" : "eksik",
      detail: eleven ? "ELEVENLABS_API_KEY tanımlı" : "ELEVENLABS_API_KEY yok",
      needsKey: !eleven,
      needsDevice: false,
    },
    {
      id: "shotstack-prod",
      label: "Shotstack production",
      state: shotProd ? "anahtar-var" : shotKey ? "stage" : "eksik",
      detail: shotProd
        ? "Production uç noktası + anahtar"
        : shotKey
          ? "Yalnızca stage anahtarı / SHOTSTACK_ENV production değil"
          : "SHOTSTACK_API_KEY yok",
      needsKey: !shotProd,
      needsDevice: false,
    },
    {
      id: "r2",
      label: "Cloudflare R2",
      state: r2 ? "anahtar-var" : "eksik",
      detail: r2 ? "R2 kimliği tanımlı" : "R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / R2_ENDPOINT yok",
      needsKey: !r2,
      needsDevice: false,
    },
    {
  
... 