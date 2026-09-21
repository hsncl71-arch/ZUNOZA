/**
 * Central credit economy. Provider USD rates live in provider-cost.ts.
 * iyzico %3 is a pricing assumption, not a signed contract rate.
 *
 * CREDIT_PER_USD = 7 so 15s Standart ≈ 15 credits (psychological scale).
 * Packages and wallets scale 7/48 from the previous 48 credits/USD table so
 * buying power and worst-case contribution stay intact. List TRY prices
 * are unchanged.
 *
 * Three ledgers stay separate:
 *   provider_cost  — USD invoice estimate (cost_ledger)
 *   customer_credit_cost — charged credits
 *   package_revenue — usable TRY after KDV + iyzico assumption
 */

import {
  ELEVEN_MUSIC_USD_PER_MIN,
  IMAGE_OUTPUT_USD,
  SHOTSTACK_USD_PER_MIN,
  USD_TRY_SNAPSHOT,
  VIDEO_INPUT_IMAGE_USD,
  VIDEO_USD_PER_SEC,
  XAI_TTS_USD_PER_MILLION_CHARS,
  XAI_VOICE_USD_PER_MIN,
  estimateChatUsd,
  estimateVideoUsd,
  qualityToResolution,
} from "./provider-cost.ts";

export const IYZICO_ASSUMPTION_PCT = 3;
export const IYZICO_ASSUMPTION_LABEL = "Fiyatlandırma varsayımı: %3";
export const KDV_RATE = 0.2;
export const SAFETY_MARGIN_PCT = 20;
/** Previous display scale. Existing wallets convert with scaleLegacyCredits. */
export const PREVIOUS_CREDIT_PER_USD = 48;
/** ceil(USD × 7). 15s Standart ≈ 15 credits; 1 credit ≈ $0.14 of API+storage. */
export const CREDIT_PER_USD = 7;
export const CREDIT_SCALE_VERSION = "cpu7";
export const WELCOME_CREDITS_DEFAULT = 10;
export const HD_QUALITY_COEF_DEFAULT = 1.15;
/** Plus usable ₺320.53 / 24 credits. Not mixed with KDV. */
export const COVERED_TRY_PER_CREDIT = 13.36;
export const FREE_MAX_VIDEO_SECONDS = 10;
export const FREE_DAILY_GENERATIONS = 8;
export const USER_DAILY_COST_USD_DEFAULT = 30;
export const VOICE_LIVE_RESERVE_MINUTES = 10;
/** Conservative R2 + egress overlay per delivered asset. Not a live invoice. */
export const STORAGE_USD_PER_VIDEO = 0.01;
export const STORAGE_USD_PER_IMAGE = 0.001;
export const STORAGE_USD_PER_AUDIO = 0.002;

export const USABLE_FRACTION = 1 - KDV_RATE / (1 + KDV_RATE) - IYZICO_ASSUMPTION_PCT / 100;

export type Quality = "ekonomik" | "standart" | "hd" | "ultra";
export type VideoDuration = 5 | 10 | 15 | 30;

export type EconomySettings = {
  usdTryRate: number;
  iyzicoAssumptionPct: number;
  safetyMarginPct: number;
  creditPerUsd: number;
  hdQualityCoef: number;
  welcomeCredits: number;
  freeMaxVideoSeconds: number;
  freeAllowUltra: boolean;
  freeDailyGenerations: number;
  userDailyCostUsd: number;
  videoUsd480: number;
  videoUsd720: number;
  videoUsd1080: number;
  videoInputImageUsd: number;
};

export const DEFAULT_ECONOMY: EconomySettings = {
  usdTryRate: USD_TRY_SNAPSHOT,
  iyzicoAssumptionPct: IYZICO_ASSUMPTION_PCT,
  safetyMarginPct: SAFETY_MARGIN_PCT,
  creditPerUsd: CREDIT_PER_USD,
  hdQualityCoef: HD_QUALITY_COEF_DEFAULT,
  welcomeCredits: WELCOME_CREDITS_DEFAULT,
  freeMaxVideoSeconds: FREE_MAX_VIDEO_SECONDS,
  freeAllowUltra: false,
  freeDailyGenerations: FREE_DAILY_GENERATIONS,
  userDailyCostUsd: USER_DAILY_COST_USD_DEFAULT,
  videoUsd480: VIDEO_USD_PER_SEC["480p"],
  videoUsd720: VIDEO_USD_PER_SEC["720p"],
  videoUsd1080: VIDEO_USD_PER_SEC["1080p"],
  videoInputImageUsd: VIDEO_INPUT_IMAGE_USD,
};

export function usableCollectionTry(priceTry: number, iyzicoPct = IYZICO_ASSUMPTION_PCT) {
  const price = Number(priceTry);
  if (!Number.isFinite(price) || price <= 0) return 0;
  const vatShare = KDV_RATE / (1 + KDV_RATE);
  const iyzico = Math.max(0, iyzicoPct) / 100;
  return Math.round(price * (1 - vatShare - iyzico) * 100) / 100;
}

export function vatAmountTry(priceTry: number) {
  const price = Number(priceTry);
  if (!Number.isFinite(price) || price <= 0) return 0;
  return Math.round(((price * KDV_RATE) / (1 + KDV_RATE)) * 100) / 100;
}

export function iyzicoAmountTry(priceTry: number, iyzicoPct = IYZICO_ASSUMPTION_PCT) {
  const price = Number(priceTry);
  if (!Number.isFinite(price) || price <= 0) return 0;
  return Math.round(price * (Math.max(0, iyzicoPct) / 100) * 100) / 100;
}

export function creditsFromUsd(usd: number, creditPerUsd = CREDIT_PER_USD) {
  if (!Number.isFinit
... 