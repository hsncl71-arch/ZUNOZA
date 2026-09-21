import type { LegalCompany, LegalSlug } from "@/lib/zunoza/legal";

const MISSING = "yönetici panelinde henüz tanımlanmadı";

export const ENTITY_LABELS: Record<string, string> = {
  esnaf: "Esnaf / şahıs işletmesi (yıllık gelir vergisi)",
  tacir: "Tacir",
  sirket: "Şirket",
  diger: "Diğer",
};

export function companyField(value: string | null | undefined) {
  const text = (value ?? "").trim();
  return text || MISSING;
}

export function serviceProviderLine(company: Pick<LegalCompany, "shopTitle" | "tradeName">) {
  const shop = (company.shopTitle || "").trim();
  const name = (company.tradeName || "").trim();
  if (shop && name) return `${shop} / ${name}`;
  return shop || name || MISSING;
}

export function publicEntityLabel(company: Pick<LegalCompany, "entityType">) {
  const key = (company.entityType || "").trim();
  if (!key) return MISSING;
  return ENTITY_LABELS[key] || key;
}

export function publicMersis(company: Pick<LegalCompany, "mersis" | "entityType">) {
  const mersis = (company.mersis || "").trim();
  if (mersis) return mersis;
  if ((company.entityType || "").trim() === "esnaf") {
    return "Esnaf / şahıs işletmesi — belgelerde MERSİS numarası yoktur; esnaf sicil kaydı kullanılır.";
  }
  return MISSING;
}

export function publicChamber(company: Pick<LegalCompany, "chamber" | "chamberStatus">) {
  return companyField(company.chamber);
}

export function publicChamberNo(company: Pick<LegalCompany, "chamberNo" | "chamberStatus">) {
  return companyField(company.chamberNo);
}

export function publicRegistry(company: Pick<LegalCompany, "registryNo" | "chamberStatus">) {
  return companyField(company.registryNo);
}

export function fillLegalBody(body: string, company: LegalCompany) {
  return body
    .replaceAll("{{UNVAN}}", companyField(company.tradeName))
    .replaceAll("{{ISYERI}}", companyField(company.shopTitle))
    .replaceAll("{{HIZMET_SAGLAYICI}}", serviceProviderLine(company))
    .replaceAll("{{ADRES}}", companyField(company.address))
    .replaceAll("{{VERGI_DAIRESI}}", companyField(company.taxOffice))
    .replaceAll("{{VERGI_NO}}", companyField(company.taxNo))
    .replaceAll("{{VERGI_TURU}}", companyField(company.taxKind))
    .replaceAll("{{EPOSTA}}", companyField(company.email))
    .replaceAll("{{TELEFON}}", companyField(company.phone))
    .replaceAll("{{KVKK_EPOSTA}}", companyField(company.kvkkEmail))
    .replaceAll("{{KVKK_ADI}}", companyField(company.kvkkContactName))
    .replaceAll("{{MERSIS}}", publicMersis(company))
    .replaceAll("{{KEP}}", companyField(company.kep))
    .replaceAll("{{MARKA}}", (company.brandName || "").trim() || "ZUNOZA AI VIDEO")
    .replaceAll("{{ODA}}", publicChamber(company))
    .replaceAll("{{ODA_KURALLAR}}", companyField(company.chamberRules))
    .replaceAll("{{TUR}}", publicEntityLabel(company))
    .replaceAll("{{SICIL}}", publicRegistry(company))
    .replaceAll("{{ODA_SICIL}}", publicChamberNo(company))
    .replaceAll("{{FAALIYET_KODU}}", companyField(company.activityCode))
    .replaceAll("{{FAALIYET}}", companyField(company.activityName))
    .replaceAll("{{ISE_BASLAMA}}", companyField(company.workStart));
}


export const LEGAL_DEFAULTS: Record<LegalSlug, { title: string; body: string }> = {
  hakkimizda: {
    title: "Hakkımızda",
    body: `ZUNOZA (ZUNOZA AI VIDEO), metinden video, görsel, ses, müzik, montaj ve yazılı/sesli yapay zekâ asistanı sunan dijital bir stüdyo hizmetidir. Fiziksel ürün veya kargo yoktur.

ZUNOZA, sunulan dijital hizmetin marka adıdır. Hizmet sağlayıcı / satıcı: {{HIZMET_SAGLAYICI}}.

Hizmet / marka: {{MARKA}}
Hizmet sağlayıcı / satıcı: {{HIZMET_SAGLAYICI}}
Ticari unvan / Ad Soyad: {{UNVAN}}
İşyeri unvanı: {{ISYERI}}
Hukuki tür: {{TUR}}
Vergi türü: {{VERGI_TURU}}
Esnaf sicil no: {{SICIL}}
MERSİS numarası: {{MERSIS}}
Vergi dairesi: {{VERGI_DAIRESI}}
Vergi kimlik no: {{VERGI_NO}}
Merkez adresi: {{ADRES}}
KEP: {{KEP}}
E-posta: {{EPOSTA}}
Telefon: {{TELEFON}}
Meslek odası: {{ODA}}
Oda sicil numarası: {{ODA_SICIL}}
Mesleki davranış kuralları ve elektronik erişim: {{ODA_KURALLAR}}
Faaliyet kodu: {{FAALIYET_KODU}}
Faaliyet: {{FAALIYET}}
İşe başlama: {{ISE_BASLAMA}}

Unvan, adres, vergi ve sicil bilgileri belgelerdeki kayıttan gelir. Belgede olmayan MERSİS veya KEP uydurulmaz.

Satılan dijital ürünler: yönetici panelinden tanımlanan kredi paketleri ve Premium süreleri.`,
  },
  iletisim: {
    title: "İletişim",
    body: `ZUNOZA AI Video iletişim

Hizmet / marka: {{MARKA}}
Hizmet sağlayıcı / satıcı: {{HIZMET_SAGLAYICI}}
Ticari unvan / Ad Soyad: {{UNVAN}}
İşyeri unvanı: {{ISYERI}}
Hukuki tür: {{TUR}}
Vergi türü: {{VERGI_TURU}}
Esnaf sicil no: {{SICIL}}
MERSİS numarası: {{MERSIS}}
Vergi kimlik numarası: {{VERGI_NO}}
Vergi dairesi: {{VERGI_DAIRESI}}
Merkez adresi: {{ADRES}}
KEP adresi: {{KEP}}
Elektronik posta: {{EPOSTA}}
Telefon: {{TELEFON}}
Meslek odası: {{ODA}}
Oda sicil numarası: {{ODA_SICIL}}
Mesleki davranış kuralları ve elektronik erişim: {{ODA_KURALLAR}}
Faaliyet: {{FAALIYET_KODU}} — {{FAALIYET}}
KVKK irtibat: {{KVKK_ADI}} — {{KVKK_EPOSTA}}

Para birimi: Türk Lirası (TRY). Satış fiyatları vergiler dahildir. Gizli ücret yoktur.
İşlem güvenliği: HTTPS/TLS; kart ödemesi iyzico 3D Secure ile alınır; kart verisi satıcıda saklanmaz.
Satış kısıtlaması: 18 yaşından küçükler yasal temsilci gözetiminde kullanmalıdır.

Destek için uygulamadaki Hata Bildir ve İstek/Öneri kanallarını da kullanabilirsiniz. Kişisel veri talepleri için Verilerim sayfası ve KVKK başvuru formu vardır.

Belgede olmayan MERSİS, KEP veya benzeri kimlik numarası uydurulmaz.`,
  },
  gizlilik: {
    title: "Gizlilik Politikası",
    body: `Bu politika, ZUNOZA’nın kişisel verileri nasıl işlediğini açıklar. Aydınlatma metni ile birlikte okunmalıdır. Veri sorumlusu: {{UNVAN}} ({{ADRES}}). İrtibat: {{KVKK_ADI}} / {{KVKK_EPOSTA}}.

1. Toplanan veriler
Hesap: ad, e-posta, oturum. Google veya X ile girişte kimlik aracısının ilettiği profil. Kredi, sipariş ve ödeme kaydı (kart iyzico’dadır). Ürettiğiniz veya yüklediğiniz medya, sohbet, kaydettiğiniz hafıza, onay kayıtları, destek/KVKK başvuruları, IP ve teknik log. Ses klonu ve canlı mikrofon yalnızca ilgili özelliği kullanırsanız.

2. Amaç
Hesabı yürütmek, stüdyo ve asistanı sunmak, kredi/Premium tahsilatı, güvenlik, yasal yükümlülük, destek.

3. Hukuki sebepler
Sözleşmenin ifası, hukuki yükümlülük, meşru menfaat (güvenlik; temel haklarınızı zedelemeyecek ölçüde), açık rıza (ses klonu, canlı mikrofon).

4. Yurt dışı aktarım (yalnızca mevcut teknik durum)
Sohbet, görsel, video, TTS ve canlı ses istekleri api.x.ai adresine gider. Müzik ve ses klonu api.elevenlabs.io adresine gider. Montaj render api.shotstack.io (uygulamada stage uç noktası) adresine gider. Medya Cloudflare R2 zunoza-media kovasına yazılır. Hesap verisi Neon PostgreSQL bağlantısıyladır. Giriş Grok kimlik aracısı üzerinden Google veya X’e dönebilir. Ödeme başlatma api.iyzipay.com (iyzico, Türkiye) üzerindedir. Yayın altyapısı Vercel’dir. Neon ve R2 bölgesi bu metinde doğrulanmamıştır. Sağlayıcıların kamuya açık DPA metinleri olabilir; bu politika, ZUNOZA adına imzalanmış DPA veya Kurul’a bildirilmiş standart sözleşme varmış gibi yazılmaz.

5. Saklama ve silme
Saklama gün sayısı henüz bağlanmamıştır. Hesap silme talebinde içerik ve R2 nesneleri silinmeye çalışılır; ödeme/uyuşmazlık kayıtları anonimleştirilerek yasal zorunluluk kadar tutulabilir. Üçüncü tara
... 