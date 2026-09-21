import { Link } from "@tanstack/react-router";

const FOOTER_LINKS = [
  { href: "/hakkimizda", label: "Hakkımızda" },
  { href: "/iletisim", label: "İletişim" },
  { href: "/gizlilik", label: "Gizlilik" },
  { href: "/kvkk-aydinlatma", label: "KVKK" },
  { href: "/kullanim-kosullari", label: "Kullanım" },
  { href: "/mesafeli-satis", label: "Mesafeli Satış" },
  { href: "/teslimat-iade", label: "İade" },
  { href: "/on-bilgilendirme", label: "Ön Bilgilendirme" },
  { href: "/iptal-iade", label: "İptal ve İade" },
  { href: "/cerez-politikasi", label: "Çerez Politikası" },
] as const;

export function SiteFooter() {
  return (
    <footer className="site-foot">
      <nav aria-label="Yasal belgeler" className="site-foot-nav">
        {FOOTER_LINKS.map((item) => (
          <a key={item.href} href={item.href}>
            {item.label}
          </a>
        ))}
      </nav>
      <p className="site-foot-mark">ZUNOZA AI Video · Hasan Öcal markasıdır</p>
    </footer>
  );
}

export function ContractLinks({ className = "" }: { className?: string }) {
  return (
    <p className={`text-[11px] leading-relaxed text-subtle ${className}`}>
      <Link to="/on-bilgilendirme" className="text-accent">
        Ön Bilgilendirme Formu
      </Link>
      ,{" "}
      <Link to="/mesafeli-satis" className="text-accent">
        Mesafeli Satış Sözleşmesi
      </Link>
      ,{" "}
      <Link to="/teslimat-iade" className="text-accent">
        Teslimat ve İade
      </Link>
      ,{" "}
      <Link to="/iptal-iade" className="text-accent">
        İptal ve İade
      </Link>
      ,{" "}
      <Link to="/kullanim-kosullari" className="text-accent">
        Kullanım Koşulları
      </Link>
      ,{" "}
      <Link to="/gizlilik" className="text-accent">
        Gizlilik
      </Link>
      ,{" "}
      <Link to="/cerez-politikasi" className="text-accent">
        Çerez Politikası
      </Link>{" "}
      ve{" "}
      <Link to="/kvkk-aydinlatma" className="text-accent">
        KVKK Aydınlatma
      </Link>
    </p>
  );
}
