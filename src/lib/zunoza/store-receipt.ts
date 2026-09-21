/** Apple App Store Server API + Google Play Developer API. Never credits. */

import { env } from "../env.server.ts";
import { storeProductForPackage, type StoreProduct } from "./store-billing.ts";
import type { StorePlatform } from "./store-verify.ts";

const APPLE_PROD = "https://api.storekit.itunes.apple.com";
const APPLE_SANDBOX = "https://api.storekit-sandbox.itunes.apple.com";
const GOOGLE_TOKEN = "https://oauth2.googleapis.com/token";
const PLAY_SCOPE = "https://www.googleapis.com/auth/androidpublisher";

export function appleIapConfigured() {
  return Boolean(env("APPLE_IAP_ISSUER_ID") && env("APPLE_IAP_KEY_ID") && env("APPLE_IAP_PRIVATE_KEY"));
}

export function googlePlayConfigured() {
  return Boolean(env("GOOGLE_PLAY_SERVICE_ACCOUNT"));
}

export function storeBillingConfigured() {
  return appleIapConfigured() || googlePlayConfigured();
}

export function appleBundleId() {
  return env("APPLE_IAP_BUNDLE_ID") || "com.zunoza.app";
}

export function googlePlayPackageName() {
  return env("GOOGLE_PLAY_PACKAGE") || "app.zunoza.mobile";
}

export type StoreReceiptVerify = {
  ok: boolean;
  message: string;
  productId?: string;
  transactionId?: string;
};

function pemFromEnv(raw: string) {
  const text = raw.replace(/\\n/g, "\n").trim();
  if (text.includes("BEGIN")) return text;
  return `-----BEGIN PRIVATE KEY-----\n${text}\n-----END PRIVATE KEY-----`;
}

async function appleSessionJwt() {
  const { SignJWT, importPKCS8 } = await import("jose");
  const key = await importPKCS8(pemFromEnv(env("APPLE_IAP_PRIVATE_KEY") || ""), "ES256");
  return new SignJWT({ bid: appleBundleId() })
    .setProtectedHeader({ alg: "ES256", kid: env("APPLE_IAP_KEY_ID"), typ: "JWT" })
    .setIssuer(env("APPLE_IAP_ISSUER_ID") || "")
    .setAudience("appstoreconnect-v1")
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(key);
}

async function verifyAppleTransaction(transactionId: string, product: StoreProduct): Promise<StoreReceiptVerify> {
  if (!appleIapConfigured()) {
    return { ok: false, message: "Apple mağaza doğrulaması bu ortamda bağlı değil. Kredi yüklenmedi." };
  }
  const token = await appleSessionJwt();
  const path = `/inApps/v1/transactions/${encodeURIComponent(transactionId)}`;
  let res = await fetch(`${APPLE_PROD}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  if (res.status === 404 || res.status === 401) {
    res = await fetch(`${APPLE_SANDBOX}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  }
  if (!res.ok) {
    return { ok: false, message: "Apple satın alma doğrulanamadı. Kredi yüklenmedi." };
  }
  const body = (await res.json()) as { signedTransactionInfo?: string };
  const jws = String(body.signedTransactionInfo || "");
  const payload = decodeJwsPayload(jws);
  const productId = String(payload.productId || "");
  const bundleId = String(payload.bundleId || "");
  const txn = String(payload.transactionId || transactionId);
  if (bundleId && bundleId !== appleBundleId()) {
    return { ok: false, message: "Apple paket kimliği eşleşmedi. Kredi yüklenmedi." };
  }
  if (productId && productId !== product.appleProductId) {
    return { ok: false, message: "Apple ürün kimliği eşleşmedi. Kredi yüklenmedi." };
  }
  return { ok: true, message: "Apple satın alma doğrulandı.", productId: productId || product.appleProductId, transactionId: txn };
}

type GoogleServiceAccount = { client_email?: string; private_key?: string; token_uri?: string };

function parseGoogleAccount(): GoogleServiceAccount | null {
  const raw = env("GOOGLE_PLAY_SERVICE_ACCOUNT");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as GoogleServiceAccount;
  } catch {
    return null;
  }
}

async function googleAccessToken() {
  const account = parseGoogleAccount();
  if (!account?.client_email || !account.private_key) {
    throw new Error("Play servis hesabı okunamadı.");
  }
  const { SignJWT, importPKCS8 } = await import("jose");
  const key = await importPKCS8(pemFromEnv(account.private_key), "RS256");
  const assertio
... 