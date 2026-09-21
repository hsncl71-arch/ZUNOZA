import { useEffect, useState } from "react";
import { getLegalCompany, type LegalCompany } from "@/lib/zunoza/legal";
import {
  companyField,
  publicChamber,
  publicChamberNo,
  publicEntityLabel,
  publicMersis,
  publicRegistry,
  serviceProviderLine,
} from "@/lib/zunoza/legal-content";

function contactRows(company: LegalCompany | null) {
  const empty: LegalCompany = {
    tradeName: "",
    address: "",
    taxOffice: "",
    taxNo: "",
    email: "",
    phone: "",
    kvkkEmail: "",
    kvkkContactName: "",
    mersis: "",
    kep: "",
    brandName: "",
    chamber: "",
    chamberRules: "",
    entityType: "",
    registryNo: "",
    chamberNo: "",
    shopTitle: "",
    activityCode: "",
    activityName: "",
    workStart: "",
    chamberStatus: "",
    taxKind: "",
  };
  const row = company || empty;
  const activity =
    [row.activityCode, row.activityName].map((part) => part.trim()).filter(Boolean).join(" — ") ||
    companyField("");
  return [
    { label: "Hizmet / marka", value: (row.brandName || "").trim() || "ZUNOZA AI VIDEO" },
    { label: "Hizmet sağlayıcı", value: serviceProviderLine(row) },
    { label: "Hukuki işletme türü", value: publicEntityLabel(row) },
    { label: "Ticari unvan / Ad Soyad", value: companyField(row.tradeName) },
    { label: "İşyeri unvanı", value: companyField(row.shopTitle) },
    { label: "Merkez adresi", value: companyField(row.address) },
    { label: "Telefon", value: companyField(row.phone) },
    { label: "Elektronik posta", value: companyField(row.email) },
    { label: "KEP adresi", value: companyField(row.kep) },
    { label: "Vergi dairesi", value: companyField(row.taxOffice) },
    { label: "Vergi türü", value: companyField(row.taxKind) },
    { label: "Vergi kimlik numarası", value: companyField(row.taxNo) },
    { label: "MERSİS numarası", value: publicMersis(row) },
    { label: "Esnaf sicil no", value: publicRegistry(row) },
    { label: "Meslek odası", value: publicChamber(row) },
    { label: "Oda sicil numarası", value: publicChamberNo(row) },
    { label: "Faaliyet", value: activity },
    { label: "İşe başlama", value: companyField(row.workStart) },
    { label: "Mesleki davranış kuralları ve elektronik erişim", value: companyField(row.chamberRules) },
  ];
}

export function MerchantContact() {
  const [company, setCompany] = useState<LegalCompany | null>(null);

  useEffect(() => {
    getLegalCompany()
      .then(setCompany)
      .catch(() => setCompany(null));
  }, []);

  return (
    <section className="rounded-2xl border border-border bg-surface p-4 text-sm" aria-labelledby="page-iletisim-heading">
      <h2 id="page-iletisim-heading" className="text-base font-semibold">
        İletişim
      </h2>
      <p className="mt-1 text-xs text-muted">
        ZUNOZA AI Video marka adıdır. Hizmet sağlayıcı, belgelerde görünen esnaf işletmesidir. Belgede olmayan MERSİS
        veya KEP yazılmaz.
      </p>
      <dl className="mt-3 grid gap-2">
        {contactRows(company).map((row) => (
          <div key={row.label} className="grid gap-0.5 sm:grid-cols-[minmax(11rem,15rem)_1fr] sm:items-start">
            <dt className="text-xs font-medium text-subtle">{row.label}</dt>
            <dd className="break-words text-sm text-fg">{row.value}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-3 space-y-1 text-xs leading-relaxed text-muted">
        <p>Para birimi: Türk Lirası (TRY). Satış fiyatları vergiler dahildir. Gizli ücret yoktur.</p>
        <p>
          İşlem güvenliği: Site HTTPS/TLS kullanır. Kart ödemesi iyzico 3D Secure ile alınır; kart verisi satıcıda
          sakla
... 