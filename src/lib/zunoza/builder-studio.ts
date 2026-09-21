export type StudioScale = "small" | "large";
export type StudioRole = "mimari" | "tasarım" | "frontend" | "veri" | "oyun" | "test";

const LARGE =
  /platform|pazaryeri|marketplace|saas|e-?ticaret|mağaza|magaza|oyun|game|canvas|multiplayer|panel|dashboard|sosyal|mesaj|ödeme|odeme|üyelik|uyelik|abonelik|kurs|eğitim|egitim|rezerv|randevu|crm|erp|blog\s*ağı|yönetim sistemi/i;

export function analyzeBuildScope(prompt: string, incremental = false) {
  const text = String(prompt || "").trim();
  const p = text.toLocaleLowerCase("tr-TR");
  if (incremental && text.length < 80 && !/sıfırdan|bastan|baştan|yeni uygulama/.test(p)) {
    const roles: StudioRole[] = /hata|bozuk|test/.test(p)
      ? ["test"]
      : /renk|font|görünüm|tasar/.test(p)
        ? ["tasarım"]
        : /veri|sepet|kayıt|görev/.test(p)
          ? ["frontend", "veri"]
          : ["frontend"];
    return {
      scale: "small" as StudioScale,
      roles,
      activity: ["Kapsam: küçük değişiklik. Ek ajan açılmadı; mevcut proje üzerinde uygulanacak."],
    };
  }
  const game = /oyun|game|canvas|skor|level|karakter/.test(p);
  const large = text.length > 140 || LARGE.test(p) || game;
  const roles: StudioRole[] = large
    ? game
      ? ["mimari", "tasarım", "oyun", "test"]
      : ["mimari", "tasarım", "frontend", "veri", "test"]
    : ["frontend"];
  const activity = large
    ? [
        `Kapsam: büyük iş (${roles.length} uzman). Mimari, tasarım, üretim ve test aynı proje üzerinde koordine edilecek.`,
        game
          ? "Oyun ajanı: oynanabilir döngü, skor ve yeniden başlatma planlandı."
          : "Mimari ajan: sayfalar, veri ve kullanıcı akışları belirlendi.",
      ]
    : ["Kapsam: tek ajan yeterli. Gereksiz uzman açılmadı."];
  return { scale: large ? ("large" as const) : ("small" as const), roles, activity };
}

export function studioBuildBrief(prompt: string, incremental: boolean) {
  const scope = analyzeBuildScope(prompt, incremental);
  if (scope.scale === "small") {
    return "Küçük iş: tek geçişte kaliteli, çalışan arayüz üret. Şişkin iskelet ve boş kart duvarı yok.";
  }
  return [
    "Büyük iş: mimari, tasarım, frontend, veri ve test aynı JSON çıktıda koordine edilsin.",
    "Boş HTML kartı / iki butonluk iskelet yasak. Gerçek ekranlar, örnek veri, çalışan etkileşim.",
    /oyun|game|canvas/i.test(prompt)
      ? "Oyun ise: giriş, oynanış, skor, kaybetme/kazanma, yeniden başla. Sahte 'yakında' ekranı yok."
      : "Platform/web ise: navigasyon, listeler, detay, form, empty/loading/error, mobil taşmasın.",
  ].join(" ");
}
