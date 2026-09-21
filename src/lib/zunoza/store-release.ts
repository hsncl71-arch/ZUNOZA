/** Store listing contract. No fake Apple/Google credentials. */

export const STORE_APP_ID = "app.zunoza.mobile";
export const STORE_IOS_BUNDLE_ID = "com.zunoza.app";
export const STORE_APP_NAME = "ZUNOZA";
export const STORE_IOS_APP_NAME = "ZUNOZA AI VIDEO";
export const STORE_VERSION_NAME = "1.0";
export const STORE_VERSION_CODE = 1;

export const STORE_RELEASE_READY = [
  "bundle-id",
  "app-name",
  "version",
  "icons",
  "splash",
  "info-plist-permissions",
  "android-manifest-permissions",
  "https-only",
  "deep-links",
  "universal-link-entitlement",
  "app-link-intent-filter",
  "storekit-catalog",
  "play-billing-permission",
  "privacy-manifest",
  "arm64",
  "release-signing-slot",
  "proguard-keeps",
  "fileprovider-scoped",
  "16kb-packaging",
  "privacy-photos-audio",
  "push-permission-slot",
] as const;

export const STORE_ACCOUNT_BLOCKERS = [
  { id: "apple-developer", need: "Onaylı Apple Developer Program hesabı" },
  { id: "apple-team-id", need: "App Store Connect Team ID — ExportOptions APPLE_TEAM_ID_TODO" },
  { id: "ios-signing", need: "Automatic signing + Distribution sertifikası / profili" },
  { id: "ios-iap-products", need: "App Store Connect IAP ürünleri (STORE_PRODUCTS)" },
  { id: "play-console", need: "Google Play Console hesabı ve uygulama kaydı" },
  { id: "play-upload-keystore", need: "android/keystore.properties + upload keystore dosyası" },
  { id: "play-app-signing", need: "Play App Signing (Google’ın imza anahtarı)" },
  { id: "play-billing-products", need: "Play Console’da aynı 10 ürün" },
  { id: "assetlinks", need: "https://…grok.me/.well-known/assetlinks.json (web host, bu görevde dokunulmadı)" },
  { id: "aasa", need: "https://…grok.me/.well-known/apple-app-site-association" },
] as const;
