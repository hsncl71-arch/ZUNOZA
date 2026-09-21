/** Detect Capacitor / store WebView without requiring the native runtime on web. */

export type NativeStore = "ios" | "android";

const NATIVE_UA = /ZUNOZANative/i;

export function nativeStoreFromUserAgent(ua: string): NativeStore | null {
  const text = String(ua || "");
  if (!NATIVE_UA.test(text)) return null;
  if (/iPhone|iPad|iPod|CPU (iPhone )?OS|Macintosh;.*Mobile/i.test(text)) return "ios";
  if (/Android/i.test(text)) return "android";
  return "android";
}

export function webIyzicoAllowedFromUserAgent(ua: string) {
  return nativeStoreFromUserAgent(ua) == null;
}

export function isNativeApp() {
  if (typeof window === "undefined") return false;
  const cap = (window as Window & { Capacitor?: { isNativePlatform?: () => boolean; getPlatform?: () => string } }).Capacitor;
  if (cap?.isNativePlatform?.()) return true;
  return nativeStoreFromUserAgent(window.navigator.userAgent) != null;
}

export function nativeStore(): NativeStore | null {
  if (typeof window === "undefined") return null;
  const cap = (window as Window & { Capacitor?: { getPlatform?: () => string } }).Capacitor;
  const platform = cap?.getPlatform?.();
  if (platform === "ios" || platform === "android") return platform;
  return nativeStoreFromUserAgent(window.navigator.userAgent);
}
