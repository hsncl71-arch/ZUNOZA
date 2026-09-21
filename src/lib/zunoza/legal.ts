import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { requireAdmin } from "@/lib/zunoza/owner";
import { LEGAL_DEFAULTS, fillLegalBody } from "@/lib/zunoza/legal-content";

export const LEGAL_SLUGS = [
  "hakkimizda",
  "iletisim",
  "gizlilik",
  "cerez-politikasi",
  "kvkk-aydinlatma",
  "kullanim-kosullari",
  "on-bilgilendirme",
  "mesafeli-satis",
  "teslimat-iade",
] as const;

export type LegalSlug = (typeof LEGAL_SLUGS)[number];

export const LEGAL_PATHS: { slug: LegalSlug; href: `/${string}`; label: string }[] = [
  { slug: "hakkimizda", href: "/hakkimizda", label: "Hakkımızda" },
  { slug: "iletisim", href: "/iletisim", label: "İletişim" },
  { slug: "gizlilik", href: "/gizlilik", label: "Gizlilik Politikası" },
  { slug: "cerez-politikasi", href: "/cerez-politikasi", label: "Çerez Politikası" },
  { slug: "kvkk-aydinlatma", href: "/kvkk-aydinlatma", label: "KVKK Aydınlatma Metni" },
  { slug: "kullanim-kosullari", href: "/kullanim-kosullari", label: "Kullanım Koşulları" },
  { slug: "on-bilgilendirme", href: "/on-bilgilendirme", label: "Ön Bilgilendirme Formu" },
  { slug: "mesafeli-satis", href: "/mesafeli-satis", label: "Mesafeli Satış Sözleşmesi" },
  { slug: "teslimat-iade", href: "/teslimat-iade", label: "Teslimat, İptal ve İade Şartları" },
];

export const LEGAL_CHROME_PATHS = new Set<string>([
  ...LEGAL_PATHS.map((item) => item.href),
  "/iptal-iade",
  "/paketler",
  "/premium",
]);

export const LEGAL_DOC_PATHS = new Set<string>([...LEGAL_PATHS.map((item) => item.href), "/iptal-iade"]);

export function isLegalChromePath(pathname: string) {
  return LEGAL_CHROME_PATHS.has(pathname);
}

export function isLegalDocPath(pathname: string) {
  return LEGAL_DOC_PATHS.has(pathname);
}

export function isLegalSlug(value: string): value is LegalSlug {
  return (LEGAL_SLUGS as readonly string[]).includes(value);
}

export type LegalCompany = {
  tradeName: string;
  address: string;
  taxOffice: string;
  taxNo: string;
  email: string;
  phone: string;
  kvkkEmail: string;
  kvkkContactName: string;
  mersis: string;
  kep: string;
  brandName: string;
  chamber: string;
  chamberRules: string;
  entityType: string;
  registryNo: string;
  chamberNo: string;
  shopTitle: string;
  activityCode: string;
  activityName: string;
  workStart: string;
  chamberStatus: string;
  taxKind: string;
};


export type LegalPage = {
  slug: string;
  title: string;
  body: string;
};

function mapCompany(row: Record<string, unknown> | undefined): LegalCompany {
  return {
    tradeName: String(row?.trade_name || ""),
    address: String(row?.address || ""),
    taxOffice: String(row?.tax_office || ""),
    taxNo: String(row?.tax_no || ""),
    email: String(row?.email || ""),
    phone: String(row?.phone || ""),
    kvkkEmail: String(row?.kvkk_email || ""),
    kvkkContactName: String(row?.kvkk_contact_name || ""),
    mersis: String(row?.mersis || ""),
    kep: String(row?.kep || ""),
    brandName: String(row?.brand_name || ""),
    chamber: String(row?.chamber || ""),
    chamberRules: String(row?.chamber_rules || ""),
    entityType: String(row?.entity_type || ""),
    registryNo: String(row?.registry_no || ""),
    chamberNo: String(row?.chamber_no || ""),
    shopTitle: String(row?.shop_title || ""),
    activityCode: String(row?.activity_code || ""),
    activityName: String(row?.activity_name || ""),
    workStart: String(row?.work_start || ""),
    chamberStatus: String(row?.chamber_status || ""),
    taxKind: String(row?.tax_kind || ""),
  };
}

type Sql = Awaited<ReturnType<typeof getSql>>;

async function loadCompany(sql: Sql) {
  const [row] = await sql<Record<string, unknown>>`
    select trade_name, address, tax_office, tax_no, email, phone, kvkk_email, kvkk_contact_name,
           mersis, kep, brand_name, chamber, chamber_rules, entity_type, registry_no, chamber_no,
           shop_title, activity_code, activity_name, work_start, chamber_status, tax_kind
    from legal_company where id = ${"default"}
  `;
  return mapCompany(row);
}

async function ensureLegalRows(sql: Sql) {
  for (const slug of LEGAL_SLUGS) {
    const def = LEGAL_DEFAULTS[slug];
    await sql`
      insert into legal_pages (slug, title, body)
      values (${slug}, ${def.title}, ${""})
      on conflict (slug) do nothing
    `;
  }
}

function isLegacyStub(slug: LegalSlug, body: string) {
  const text = body.trim();
  if (!text) return true;
  if (slug === "mesafeli-satis" && text.length < 1200 && /Delil:\s*Elektronik kayı
... 