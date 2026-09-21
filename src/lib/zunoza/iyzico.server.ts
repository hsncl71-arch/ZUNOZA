import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { request as httpsRequest } from "node:https";
import { writeFileSync } from "node:fs";
import { buildIyzicoBuyer, assertSafeIyzicoPayload, redactIdentity, parseCheckoutBuyerInput, isBuyerFieldError, containsForbiddenIdentity, serializedBuyerHasRequiredIds } from "./iyzico-buyer.ts";

const LIVE_BASE = "https://api.iyzipay.com";
const SANDBOX_BASE = "https://sandbox-api.iyzipay.com";
const INIT_PATH = "/payment/iyzipos/checkoutform/initialize/auth/ecom";
const RETRIEVE_PATH = "/payment/iyzipos/checkoutform/auth/ecom/detail";

export type IyzicoCheckoutInit = {
  status?: string;
  errorCode?: string;
  errorGroup?: string;
  errorMessage?: string;
  token?: string;
  paymentPageUrl?: string;
  conversationId?: string;
};

export type IyzicoCheckoutResult = {
  status?: string;
  paymentStatus?: string;
  errorMessage?: string;
  token?: string;
  conversationId?: string;
  paymentId?: string | number;
  basketId?: string;
  currency?: string;
  price?: number | string;
  paidPrice?: number | string;
  signature?: string;
  fraudStatus?: number | string;
};

const API_KEY_NAMES = [
  "IYZICO_API_KEY",
  "IYZI_API_KEY",
  "IYZIPAY_API_KEY",
  "IYZICO_APIKEY",
] as const;
const SECRET_KEY_NAMES = [
  "IYZICO_SECRET_KEY",
  "IYZI_SECRET_KEY",
  "IYZIPAY_SECRET_KEY",
  "IYZICO_SECRET",
] as const;
const BASE_URL_NAMES = ["IYZICO_BASE_URL", "IYZI_BASE_URL", "IYZIPAY_BASE_URL"] as const;

function envValue(names: readonly string[]) {
  const wanted = new Set(names.map((name) => name.replace(/[\s-]+/g, "_").toUpperCase()));
  for (const [key, raw] of Object.entries(process.env)) {
    if (!wanted.has(key.replace(/[\s-]+/g, "_").toUpperCase())) continue;
    const value = String(raw ?? "").trim();
    if (value) return value;
  }
  return "";
}

function apiKey() {
  return envValue(API_KEY_NAMES);
}

function secretKey() {
  return envValue(SECRET_KEY_NAMES);
}

export function iyzicoKeyLooksSandbox() {
  return /^sandbox[-_]/i.test(apiKey());
}

export function iyzicoBaseUrl() {
  if (iyzicoKeyLooksSandbox()) return SANDBOX_BASE;
  const raw = envValue(BASE_URL_NAMES).replace(/\/$/, "");
  if (raw && !/sandbox/i.test(raw)) return raw;
  return LIVE_BASE;
}

/** Live merchant keys on the public app; sandbox keys only in workspace preview. */
export function iyzicoConfigured() {
  if (!apiKey() || !secretKey()) return false;
  const deployed = Boolean(process.env.GROK_PROJECT_ID?.trim());
  if (deployed && iyzicoKeyLooksSandbox()) return false;
  return true;
}

export function iyzicoRuntimeMode(): "missing" | "sandbox" | "live" {
  if (!apiKey() || !secretKey()) return "missing";
  if (iyzicoKeyLooksSandbox() || /sandbox/i.test(iyzicoBaseUrl())) return "sandbox";
  return "live";
}

export function publicIyzicoError(
  message?: string | null,
  fallback = "Ödeme başlatılamadı. Lütfen tekrar deneyin.",
  errorCode?: string | number | null,
) {
  const code = String(errorCode ?? "").trim();
  const withCode =
    code && /^\d{1,6}$/.test(code) ? `${fallback} (iyzico ${code})` : fallback;
  if (isBuyerFieldError(message)) return String(message).replace(/\s+/g, " ").trim().slice(0, 180);
  const msg = redactIdentity(String(message || "").replace(/\s+/g, " ").trim());
  if (!msg) return withCode;
  if (
    /api[_-]?key|secret|authorization|iyziwsv|hmac|token=|buyer[cf]|identitynumber|gsmnumber|errorcode|stack|sql|signature|json|fetch failed|econnreset|enotfound|etimedout|und_err|socket|iyzico-net/i.test(
      msg,
    )
  ) {
    return withCode;
  }
  if (/kimlik|tckn|gsm|telefon/i.test(msg) && /zorunlu|gönderil|invalid|geçersiz/i.test(msg)) {
    return withCode;
  }
  return msg.slice(0, 180);
}

function hmacHex(data: string) {
  return createHmac("sha256", secretKey()).update(data).digest("hex");
}

function safeEqualHex(a: string, b: string) {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

function authorizationV2(uri: string, body: unknown, randomString: string) {
  const payload = typeof body === "string" ? body : JSON.stringify(body);
  const signature = hmacHex(randomString + uri + payload);
  const packed = [`apiKey:${apiKey()}`, `randomKey:${randomString}`, `signature:${signature}`].join("&");
  return `IYZWSv2 ${Buffer.from(packed).toString("base64")}`;
}

function recordInitDiag(path: string, body: Record<string, unknown>, json: Record<string, unknown>) {
  const buyer = body.buyer && typeof body.buyer === "object" ? Object.keys(body.buyer as object).sort() : [];
  const billing =
    body.billingAddress && typeof body.billingAddress === "object"
      ? Object.keys(body.billingAddress as object).sort()
      : [];
  const diag = {
    at: new Date().toISOString(),
    path,
    base: iyzicoBaseUrl(),
    mode: iyzicoRuntimeMode(),
    configured: iyzicoConfigured(),
    sandboxKey: iyzicoKeyLooksSandbox(),
    hasApi: Boolean(apiKey()),
    hasSecret: Boolean(secretKey()),
    grokProject: Boolean(process.env.GROK_PROJECT_ID?.trim()),
    buyerFields: buyer,
    billingFields: billing,
    httpStatus: json.httpStatus ?? json.status,
    errorCode: json.errorCode ?? null,
    errorGroup: json.errorGroup ?? null,
    errorMessage: redactIdentity(String(json.errorMessage || "")).slice(0, 180),
    hasToken: Boolean(json.token),
    hasPage: Boolean(json.paymentPageUrl),
  };
  try {
    writeFileSync("/tmp/zunoza-iyzico-last.json", JSON.stringify(diag));
  } catch {
    /* ignore */
  }
  console.error("[iyzico-init]", JSON.stringify(diag));
}

type IyzicoHttpResult = {
  httpStatus: number;
  json: Record<string, unknown>;
};

function parseIyzicoResponse(httpStatus: number, text: string): IyzicoHttpResult {
  let json: Record<string, unknown> = {};
  if (text) {
    try {
      const parsed = JSON.parse(text) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        json = parsed as Record<string, unknown>;
      }
    } catch {
      json = {};
    }
  }
  if (!json.status && httpStatus && httpStatus !== 200) {
    json = {
      status: "failure",
      errorCode: String(json.errorCode || httpStatus),
      errorGroup: "HTTP",
      errorMessage: String(json.errorMessage || "").slice(0, 120),
    };
  }
  return { httpStatus, json };
}

function iyzicoHttpsPost(
  url: string,
  headers: Record<string, string>,
  body: string,
  family?: 4,
): Promise<IyzicoHttpResult> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = httpsRequest(
      {
        protocol: "https:",
        hostname: parsed.hostname,
        port: parsed.port || 443,
        servername: parsed.hostname,
        path: `${parsed.pathname}${parsed.search}`,
        method: "POST",
        ...(family === 4 ? { family: 4 as const } : {}),
        minVersion: "TLSv1.2",
        headers: {
          ...headers,
          Accept: "application/json",
          "User-Agent": "iyzipay-node",
          "Content-Length": String(Buffer.byteLength(body)),
        },
        timeout: 30_000,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk) => chunks.push(chunk as Buffer));
        res.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf8");
          resolve(parseIyzicoResponse(res.statusCode || 0, text));
        });
      },
    );
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("timeout"));
    });
    req.write(body);
    req.end();
  });
}

function networkCode(err: unknown) {
  if (!err || typeof err !== "object") return "";
  const direct = "code" in err ? String((err as { code?: string }).code || "") : "";
  const cause =
    "cause" in err ? String((err as { cause?: { code?: string } }).cause?.code || "") : "";
  return direct || cause;
}

async function iyzicoHttpsPostRetry(url: string, headers: Record<string, string>, body: string) {
  let last: unknown;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      return await iyzicoHttpsPost(url, headers, body, attempt % 2 === 0 ? 4 : undefined);
    } catch (err) {
      last = err;
      const code = `${networkCode(err)} ${err instanceof Error ? err.message : ""}`;
      if (!/ECONNRESET|EPIPE|ECONNREFUSED|ETIMEDOUT|ENETUNREACH|EHOSTUNREACH|timeout/i.test(code)) throw err;
      await new Promise((resolve) => setTimeout(resolve, 200 * (attempt + 1)));
    }
  }
  throw last instanceof Error ? last : new Error("timeout");
}

export type IyzicoProbeCall = {
  httpStatus: number;
  status: string;
  errorCode: string | null;
  errorGroup: string | null;
  errorMessage: string;
  hasToken: boolean;
  hasPage: boolean;
  net: string;
};

function summarizeProbe(result: IyzicoHttpResult): IyzicoProbeCall {
  const json = result.json;
  return {
    httpStatus: result.httpStatus,
    status: String(json.status || ""),
    errorCode: json.errorCode == null || json.errorCode === "" ? null : String(json.errorCode),
    errorGroup: json.errorGroup == null || json.errorGroup === "" ? null : String(json.errorGroup),
    errorMessage: redactIdentity(String(json.errorMessage || "")).slice(0, 180),
    hasToken: Boolean(json.token),
    hasPage: Boolean(json.paymentPageUrl),
    net: "",
  };
}

async function signedIyzicoCall(path: string, body: Record<string, unknown>): Promise<IyzicoHttpResult> {
  const serialized = JSON.stringify(body);
  const randomString = `${Date.now()}${randomBytes(4).toString("hex")}`;
  return iyzicoHttpsPostRetry(
    `${iyzicoBaseUrl()}${path}`,
    {
      Authorization: authorizationV2(path, serialized, randomString),
      "x-iyzi-rnd": randomString,
      "Content-Type": "application/json",
    },
    serialized,
  );
}

async function iyzicoPost<T>(path: string, body: Record<string, unknown>): Promise<T> {
  assertSafeIyzicoPayload(body);
  const serialized = JSON.stringify(body);
  if (path === INIT_PATH && containsForbiddenIdentity(serialized)) {
    throw new Error("Ödeme başlatılamadı. Lütfen tekrar deneyin.");
  }
  let result: IyzicoHttpResult;
  try {
    result = await signedIyzicoCall(path, body);
  } catch (err) {
    const code = networkCode(err);
    console.error("[iyzico-init]", JSON.stringify({ path, base: iyzicoBaseUrl(), net: code || "error" }));
    throw new Error(`iyzico-net:${code || "error"}`);
  }
  if (path === INIT_PATH) {
    recordInitDiag(path, body, { ...result.json, httpStatus: result.httpStatus });
  }
  if (
    path === INIT_PATH &&
    result.json.status !== "success" &&
    !result.json.errorCode &&
    result.httpStatus &&
    result.httpStatus !== 200
  ) {
    result.json.errorCode = String(result.httpStatus);
    result.json.errorGroup = String(result.json.errorGroup || "HTTP");
  }
  return result.json as T;
}

/** Production-only connectivity probe. Never sends dummy TCKN/GSM. Never returns secrets or page URLs. */
export async function probeIyzicoLive(callbackUrl: string): Promise<{
  configured: boolean;
  mode: "missing" | "sandbox" | "live";
  sandboxKey: boolean;
  hasApi: boolean;
  hasSecret: boolean;
  grokProject: boolean;
  baseHost: string;
  bin: IyzicoProbeCall | null;
  init: IyzicoProbeCall | null;
}> {
  let baseHost = "";
  try {
    baseHost = new URL(iyzicoBaseUrl()).host;
  } catch {
    baseHost = "";
  }
  const report = {
    configured: iyzicoConfigured(),
    mode: iyzicoRuntimeMode(),
    sandboxKey: iyzicoKeyLooksSandbox(),
    hasApi: Boolean(apiKey()),
    hasSecret: Boolean(secretKey()),
    grokProject: Boolean(process.env.GROK_PROJECT_ID?.trim()),
    baseHost,
    bin: null as IyzicoProbeCall | null,
    init: null as IyzicoProbeCall | null,
  };
  if (!apiKey() || !secretKey()) return report;

  try {
    report.bin = summarizeProbe(
      await signedIyzicoCall("/payment/bin/check", {
        locale: "tr",
        conversationId: "diag-bin",
        binNumber: "454360",
      }),
    );
  } catch (err) {
    report.bin = {
      httpStatus: 0,
      status: "network",
      errorCode: networkCode(err) || "error",
      errorGroup: null,
      errorMessage: "",
      hasToken: false,
      hasPage: false,
      net: networkCode(err) || "error",
    };
  }

  const initBody: Record<string, unknown> = {
    locale: "tr",
... 

export function iyzicoAmount(value: number) {
  return Math.round(Number(value) * 100) / 100;
}

export async function initializeCheckoutForm(input: {
  conversationId: string;
  callbackUrl: string;
  priceTry: number;
  basketId: string;
  itemName: string;
  buyerId: string;
  buyerName: string;
  buyerSurname: string;
  email: string;
  ip: string;
  identityNumber: string;
}): Promise<IyzicoCheckoutInit> {
  const price = iyzicoAmount(input.priceTry);
  const buyer = buildIyzicoBuyer({
    buyerId: input.buyerId,
    buyerName: input.buyerName,
    buyerSurname: input.buyerSurname,
    email: input.email,
    ip: input.ip,
    identityNumber: input.identityNumber,
  });
  const address = {
    address: "Dijital teslimat",

... 