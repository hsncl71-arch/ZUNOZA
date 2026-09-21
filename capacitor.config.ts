import type { CapacitorConfig } from "@capacitor/cli";

const remoteUrl = (process.env.CAP_SERVER_URL || "https://lunar-sapphire-honey-able.grok.me").trim();

const config: CapacitorConfig = {
  appId: "com.zunoza.app",
  appName: "ZUNOZA AI VIDEO",
  webDir: "native/www",
  backgroundColor: "#05050a",
  appendUserAgent: "ZUNOZANative/1",
  zoomEnabled: false,
  server: {
    url: remoteUrl,
    cleartext: false,
    allowNavigation: [
      "lunar-sapphire-honey-able.grok.me",
      "*.grok.me",
      "auth.grok.me",
      "appleid.apple.com",
      "*.apple.com",
      "accounts.google.com",
      "*.google.com",
      "*.googleapis.com",
      "*.gstatic.com",
      "*.googleusercontent.com",
      "api.x.ai",
      "*.x.ai",
      "*.x.com",
      "*.twitter.com",
      "accounts.x.com",
      "api.twitter.com",
      "*.cloudflare.com",
      "*.iyzico.com",
      "*.iyzipay.com",
      "*.elevenlabs.io",
      "*.shotstack.io",
      "*.r2.dev",
      "*.cloudflarestorage.com",
    ],
  },
  android: {
    allowMixedContent: false,
    webContentsDebuggingEnabled: process.env.CAP_ENV === "development",
    overrideUserAgent:
      "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36 ZUNOZANative/1",
    backgroundColor: "#05050a",
  },
  ios: {
    contentInset: "automatic",
    preferredContentMode: "mobile",
    scheme: "ZUNOZA",
    limitsNavigationsToAppBoundDomains: false,
    scrollEnabled: true,
    backgroundColor: "#05050a",
    overrideUserAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1 ZUNOZANative/1",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 500,
      launchAutoHide: true,
      backgroundColor: "#05050a",
      showSpinner: false,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#05050a",
    },
    Keyboard: {
      resize: "body",
      resizeOnFullScreen: true,
    },
    Camera: {
      presentationStyle: "fullscreen",
    },
  },
};

export default config;
