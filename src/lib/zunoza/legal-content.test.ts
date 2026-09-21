import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  LEGAL_DEFAULTS,
  fillLegalBody,
  companyField,
  publicChamber,
  publicChamberNo,
  publicMersis,
  publicRegistry,
  serviceProviderLine,
} from "./legal-content.ts";

const emptyCompany = {
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

const verifiedCompany = {
  ...emptyCompany,
  tradeName: "HASAN ÖCAL",
  shopTitle: "ÖZ ÖCAL TESBİHÇİLİK",
  brandName: "ZUNOZA",
  address: "YENİŞEHİR MAH. KAZIM KARABEKİR CAD. YAŞAM APT. NO: 39 İÇ KAPI NO: 1 YAHŞİHAN / KIRIKKALE",
  taxOffice: "IRMAK VERGİ DAİRESİ MÜDÜRLÜĞÜ",
  taxKind: "Yıllık gelir vergisi",
  entityType: "esnaf",
  activityCode: "479114",
  activityName: "Radyo, televizyon, posta yoluyla veya internet üzerinden yapılan perakende ticaret",
  workStart: "06/05/2022",
  registryNo: "141414",
  chamberNo: "7050",
  chamber: "MUĞLA ESNAF VE SANATKÂRLAR ODALARI BİRLİĞİ",
  chamberStatus: "needs_review",
};

describe("legal-content", () => {
  it("covers required documents", () => {
    const slugs = Object.keys(LEGAL_DEFAULTS);
    for (const need of [
      "hakkimizda",
      "gizlilik",
      "cerez-politikasi",
      "kvkk-aydinlatma",
      "kullanim-kosullari",
      "on-bilgilendirme",
      "mesafeli-satis",
      "teslimat-iade",
      "iletisim",
    ]) {
      assert.ok(slugs.includes(need), need);
    }
  });

  it("does not invent identity or signed contracts", () => {
    const all = Object.values(LEGAL_DEFAULTS)
      .map((item) => item.body)
      .join("\n");
    assert.equal(all.includes("11111111111"), false);
    assert.equal(all.includes("05350000000"), false);
    assert.equal(/DPA imzalandı/i.test(all), false);
    assert.equal(/standart sözleşme bildirildi/i.test(all), false);
    assert.match(all, /pornografik/);
    assert.match(all, /kumar/);
    assert.equal(/zunoza\.com/i.test(all), false);
    assert.equal(/ZUNOZA LTD/i.test(all), false);
    assert.equal(/ZUNOZA A\.Ş/i.test(all), false);
  });

  it("keeps a distance-sales contract that iyzico and 6502 reviewers can find", () => {
    const page = LEGAL_DEFAULTS["mesafeli-satis"];
    assert.equal(page.title, "Mesafeli Satış Sözleşmesi");
    const body = page.body;
    assert.match(body, /6502/);
    assert.match(body, /Mesafeli Sözleşmeler Yönetmeliği/);
    assert.match(body, /MADDE 1/);
    assert.match(body, /{{UNVAN}}/);
    assert.match(body, /{{ADRES}}/);
    assert.match(body, /{{EPOSTA}}/);
    assert.match(body, /{{MERSIS}}/);
    assert.match(body, /{{KEP}}/);
    assert.match(body, /{{ISYERI}}/);
    assert.match(body, /iyzico/);
    assert.match(body, /14/);
    assert.match(body, /cayma/i);
    assert.match(body, /dijital/i);
    assert.match(body, /Tüketici Hakem Heyeti/);
    assert.match(body, /kargo/i);
    assert.equal(body.includes("11111111111"), false);
    assert.ok(body.length > 2500, `contract too short: ${body.length}`);
  });

  it("puts the contract on the homepage strip, footer, and checkout", () => {
    const footer = readFileSync(new URL("../../../src/components/site-footer.tsx", import.meta.url), "utf8");
    const home = readFileSync(new URL("../../../src/routes/index.tsx", import.meta.url), "utf8");
    const checkout = readFileSync(new URL("../../../src/components/checkout-review.tsx", import.meta.url), "utf8");
    const contact = readFileSync(new URL("../../../src/components/merchant-contact.tsx", import.meta.url), "utf8");
    assert.match(footer, /Mesafeli Satış Sözleşmesi/);
    assert.match(footer, /İptal ve İade Politikası/);
    assert.match(footer, /KVKK Aydınlatma Metni/);
    assert.match(footer, /HomeLegalStrip/);
    ass
... 