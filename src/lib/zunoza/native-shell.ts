/** Capacitor chrome: status bar, keyboard, back, lifecycle, deep links. No-ops on web. */

import { nativeStore } from "./native-platform.ts";

let attached = false;

const APP_HOSTS = /(^|\.)grok\.me$/i;

function safeInAppPath(raw: string) {
  const value = String(raw || "").trim();
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\") || value.includes("://")) {
    return "/";
  }
  try {
    const parsed = new URL(value, "https://app.zunoza.mobile");
    if (parsed.hostname !== "app.zunoza.mobile") return "/";
    const path = parsed.pathname || "/";
    if (!/^\/[A-Za-z0-9/_-]*$/.test(path)) return "/";
    return `${path}${parsed.search}` || "/";
  } catch {
    return "/";
  }
}

function pathFromNativeUrl(url: string) {
  const parsed = new URL(url);
  const protocol = parsed.protocol.toLowerCase();
  if (protocol !== "https:" && protocol !== "http:" && protocol !== "zunoza:" && protocol !== "app.zunoza.mobile:" && protocol !== "com.zunoza.app:") {
    return "/";
  }
  if (protocol === "http:" || protocol === "https:") {
    if (protocol !== "https:" || !APP_HOSTS.test(parsed.hostname)) return "/";
  }
  const fromQuery = parsed.searchParams.get("path");
  if (fromQuery) return safeInAppPath(fromQuery);
  if (protocol === "https:") {
    return safeInAppPath(`${parsed.pathname}${parsed.search}` || "/");
  }
  const host = parsed.hostname || "";
  const path = parsed.pathname && parsed.pathname !== "/" ? parsed.pathname : "";
  const next = `/${host}${path}`.replace(/\/+/g, "/");
  return safeInAppPath(next === "/" ? "/" : next);
}

export function nativeBackShouldNavigate(canGoBack: boolean) {
  return Boolean(canGoBack);
}

function pausePageMedia() {
  if (typeof document === "undefined") return;
  document.querySelectorAll("video, audio").forEach((node) => {
    const el = node as HTMLMediaElement;
    try {
      el.pause();
    } catch {
      /* ignore */
    }
  });
}

async function registerNativePush() {
  try {
    const mod = await import("@capacitor/push-notifications").catch(() => null);
    if (!mod?.PushNotifications) return;
    const status = await mod.PushNotifications.requestPermissions();
    if (status.receive !== "granted") return;
    await mod.PushNotifications.addListener("registration", ({ value }) => {
      const platform = nativeStore() === "ios" ? "ios" : "android";
      if (!value || value.length < 16) return;
      void import("./native-push.ts")
        .then(({ registerNativePushToken }) =>
          registerNativePushToken({ data: { token: value, platform } }),
        )
        .catch(() => undefined);
    });
    await mod.PushNotifications.register();
  } catch {
    /* plugin or credentials missing */
  }
}

export async function attachNativeShell() {
  if (typeof window === "undefined") return;
  try {
    const { Capacitor } = await import("@capacitor/core");
    if (!Capacitor.isNativePlatform()) return;
    const [{ StatusBar, Style }, { Keyboard }, { App }, { SplashScreen }] = await Promise.all([
      import("@capacitor/status-bar"),
      import("@capacitor/keyboard"),
      import("@capacitor/app"),
      import("@capacitor/splash-screen"),
    ]);
    await StatusBar.setStyle({ style: Style.Dark }).catch(() => undefined);
    await StatusBar.setBackgroundColor({ color: "#05050a" }).catch(() => undefined);
    await Keyboard.setResizeMode({ mode: "body" as never }).catch(() => undefined);
    await SplashScreen.hide().catch(() => undefined);
    if (attached) return;
    attached = true;
    App.addListener("appUrlOpen", ({ url }) => {
      try {
        window.location.assign(pathFromNativeUrl(url));
      } catch {
        /* ignore malformed deep links */
      }
    });
    App.addListener("backButton", ({ canGoBack }) => {
      if (nativeBackShouldNavigate(canGoBack)) {
        window.history.back();
        return;
      }
      void App.exitApp();
    });
    App.addListener("appStateChange", ({ isActive }) => {
      if (!isActive) pausePageMedia();
    });
    void registerNativePush().catch(() => undefined);
  } catch {
    /* web / missing plugins */
  }
}

export { pathFromNativeUrl, safeInAppPath };
