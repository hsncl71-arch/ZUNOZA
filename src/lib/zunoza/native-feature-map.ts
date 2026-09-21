/** Exhaustive map of working ZUNOZA product surfaces carried into iOS/Android. */

export type NativeCapability =
  | "shell"
  | "auth"
  | "microphone"
  | "camera"
  | "gallery"
  | "files"
  | "share"
  | "download"
  | "playback"
  | "keyboard"
  | "store-catalog";

export type NativeProductFeature = {
  id: string;
  path: string;
  title: string;
  capabilities: NativeCapability[];
};

export const NATIVE_PRODUCT_FEATURES: NativeProductFeature[] = [
  { id: "home", path: "/", title: "Ana sayfa / ilham vitrini / stüdyolar / Sor / Konuş", capabilities: ["shell", "keyboard", "microphone", "playback"] },
  { id: "ask", path: "/asistan", title: "ZUNOZA’ya Sor, yazı, ses, hafıza, arama", capabilities: ["auth", "microphone", "keyboard", "files", "gallery", "camera"] },
  { id: "video", path: "/olustur", title: "AI Video — metinden ve görselden video", capabilities: ["auth", "gallery", "files", "camera", "playback"] },
  { id: "image", path: "/gorsel", title: "AI Görsel", capabilities: ["auth", "gallery", "files", "camera", "share", "download"] },
  { id: "music", path: "/muzik", title: "AI Müzik", capabilities: ["auth", "files", "playback", "share", "download"] },
  { id: "voice", path: "/seslendirme", title: "Seslendirme", capabilities: ["auth", "microphone", "playback", "share", "download"] },
  { id: "storyboard", path: "/storyboard", title: "Storyboard / Klip", capabilities: ["auth", "playback"] },
  { id: "cover", path: "/kapak", title: "Kapak", capabilities: ["auth", "gallery", "share", "download"] },
  { id: "memory", path: "/anilar", title: "Anılarını Canlandır", capabilities: ["auth", "gallery", "files", "camera", "playback", "share", "download"] },
  { id: "montage", path: "/montaj", title: "Montaj", capabilities: ["auth", "files", "gallery", "playback"] },
  { id: "montage-editor", path: "/montaj/ornek", title: "Montaj editörü", capabilities: ["auth", "files", "gallery", "share", "download", "playback"] },
  { id: "builder", path: "/insa-et", title: "İnşa Et", capabilities: ["auth", "files"] },
  { id: "builder-project", path: "/insa-et/ornek", title: "İnşa Et proje", capabilities: ["auth", "files", "share", "download"] },
  { id: "script", path: "/senaryo", title: "Senaryo", capabilities: ["auth", "keyboard"] },
  { id: "social", path: "/sosyal", title: "Sosyal", capabilities: ["auth"] },
  { id: "feed", path: "/akis", title: "Akış", capabilities: ["auth", "playback"] },
  { id: "projects", path: "/projeler", title: "Projelerim", capabilities: ["auth"] },
  { id: "videos", path: "/videolarim", title: "Videolarım", capabilities: ["auth", "playback"] },
  { id: "video-detail", path: "/videolarim/ornek", title: "Video detay / oynatma / kaydet", capabilities: ["auth", "playback", "share", "download"] },
  { id: "profile", path: "/profil", title: "Profil", capabilities: ["auth"] },
  { id: "login", path: "/login", title: "Giriş — Google, Apple, X, e-posta", capabilities: ["auth"] },
  { id: "oauth-return", path: "/giris-donus", title: "OAuth dönüş", capabilities: ["auth"] },
  { id: "packages", path: "/paketler", title: "Paketler / kredi", capabilities: ["auth", "store-catalog"] },
  { id: "premium", path: "/premium", title: "Premium", capabilities: ["auth", "store-catalog"] },
  { id: "credits", path: "/kredilerim", title: "Kredilerim", capabilities: ["auth"] },
  { id: "settings", path: "/ayarlar", title: "Ayarlar", capabilities: ["auth"] },
  { id: "data", path: "/verilerim", title: "Verilerim / hafıza", capabilities: ["auth"] },
  { id: "analytics", path: "/analitik", title: "Analitik", capabilities: ["auth"] },
  { id: "contact", path: "/iletisim", title: "İletişim", capabilities: ["shell"] },
  { id: "help", path: "/yardim", title: "Yardım", capabilities: ["shell"] },
  { id: "bug", path: "/hata-bildir", title: "Hata bildir", capabilities: ["auth", "keyboard"] },
  { id: "request", path: "/istek-oneri", title: "İstek öneri", capabilities: ["auth", "keyboard"] },
  { id: "privacy", path: "/gizlilik", title: "Gizlilik", capabilities: ["shell"] },
  { id: "terms", path: "/kullanim-kosullari", title: "Kullanım koşulları", capabilities: ["shell"] },
  { id: "about", path: "/hakkimizda", title: "Hakkımızda", capabilities: ["shell"] },
  { id: "cookies", path: "/cerez-politikasi", title: "Çerez politikası", capabilities: ["shell"] },
  { id: "kvkk", path: "/kvkk-aydinlatma", title: "KVKK aydınlatma", capabilities: ["shell"] },
  { id: "distance", path: "/mesafeli-satis", title: "Mesafeli satış", capabilities: ["shell"] },
  { id: "preinfo", path: "/on-bilgilendirme", title: "Ön bilgilendirme", capabilities: ["shell"] },
  { id: "cancel", path: "/iptal-iade", title: "İptal iade", capabilities: ["shell"] },
  { id: "delivery", path: "/teslimat-iade", title: "Teslimat iade", capabilities: ["shell"] },
  { id: "admin", path: "/yonetici", title: "Yönetici", capabilities: ["auth"] },
];

export function nativeProductPaths() {
  return NATIVE_PRODUCT_FEATURES.map((row) => row.path);
}

export function nativeDeepLinkPath(path: string) {
  const next = path.startsWith("/") ? path : `/${path}`;
  return next;
}
