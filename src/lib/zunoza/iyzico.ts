import { createHmac, randomBytes } from "node:crypto";

const LIVE_BASE = "https://api.iyzipay.com";
const INIT_PATH = "/payment/iyzipos/checkoutform/initialize/auth/ecom";
const RETRIEVE_PATH = "/payment/iyzipos/checkoutform/auth/ecom/detail";

export type IyzicoCheckoutInit = {
  status?: string;
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
  price?: number | string;
  paidPrice?: number | string;
};

function apiKey() {
  return process.env.IYZICO_API_KEY?.trim() || "";
}

function secretKey() {
  return process.env.IYZICO_SECRET_KEY?.trim() || "";
}

function baseUrl() {
  const raw = process.env.IYZICO_BASE_URL?.trim().replace(/\/$/, "");
  return raw || LIVE_BASE;
}

export function iyzicoConfigured() {
  return Boolean(apiKey() && secretKey());
}

function authorizationV2(uri: string, body: unknown, randomString: string) {
  const signature = createHmac("sha256", secretKey())
    .update(randomString + uri + JSON.stringify(body))
    .digest("hex");
  const packed = [`apiKey:${apiKey()}`, `randomKey:${randomString}`, `signature:${signature}`].join("&");
  return `IYZWSv2 ${Buffer.from(packed).toString("base64")}`;
}

async function iyzicoPost<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const randomString = `${Date.now()}${randomBytes(4).toString("hex")}`;
  const res = await fetch(`${baseUrl()}${path}`, {
    method: "POST",
    headers: {
      Authorization: authorizationV2(path, body, randomString),
      "x-iyzi-rnd": randomString,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  });
  const json = (await res.json().catch(() => ({}))) as T;
  return json;
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
}): Promise<IyzicoCheckoutInit> {
  const price = Number(input.priceTry);
  const contact = `${input.buyerName} ${input.buyerSurname}`.trim();
  const address = {
    address: "Dijital teslimat",
    zipCode: "34000",
    contactName: contact || "ZUNOZA",
    city: "Istanbul",
    country: "Turkey",
  };
  return iyzicoPost<IyzicoCheckoutInit>(INIT_PATH, {
    locale: "tr",
    conversationId: input.conversationId,
    price,
    paidPrice: price,
    currency: "TRY",
    basketId: input.basketId,
    paymentGroup: "PRODUCT",
    callbackUrl: input.callbackUrl,
    enabledInstallments: [1],
    buyer: {
      id: input.buyerId.slice(0, 64),
      name: input.buyerName,
      surname: input.buyerSurname,
      identityNumber: "11111111111",
      email: input.email,
      gsmNumber: "+905350000000",
      registrationDate: "2024-01-01 00:00:00",
      lastLoginDate: "2024-01-01 00:00:00",
      registrationAddress: address.address,
      city: address.city,
      country: address.country,
      zipCode: address.zipCode,
      ip: input.ip,
    },
    shippingAddress: address,
    billingAddress: address,
    basketItems: [
      {
        id: input.basketId,
        price,
        name: input.itemName,
        category1: "Kredi",
        itemType: "VIRTUAL",
      },
    ],
  });
}

export async function retrieveCheckoutForm(token: string, conversationId?: string) {
  return iyzicoPost<IyzicoCheckoutResult>(RETRIEVE_PATH, {
    locale: "tr",
    conversationId: conversationId || token,
    token,
  });
}

export function verifyWebhookSignatureV3(header: string | null, payload: Record<string, unknown>) {
  if (!header || !secretKey()) return false;
  const data =
    secretKey() +
    String(payload.iyziEventType ?? "") +
    String(payload.iyziPaymentId ?? "") +
    String(payload.token ?? "") +
    String(payload.paymentConversationId ?? "") +
    String(payload.st
... 