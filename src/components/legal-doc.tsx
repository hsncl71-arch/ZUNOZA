import { useEffect, useState } from "react";
import { GuestShell } from "@/components/shell";
import { MerchantContact } from "@/components/merchant-contact";
import { getLegalPage, type LegalSlug } from "@/lib/zunoza/legal";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export function LegalDoc({ slug }: { slug: LegalSlug }) {
  const { user, isPending } = useCurrentUserState();
  const inner = <Doc slug={slug} />;
  if (user) return inner;
  return <GuestShell showSignIn={!isPending}>{inner}</GuestShell>;
}

function Doc({ slug }: { slug: LegalSlug }) {
  const [title, setTitle] = useState("Yükleniyor…");
  const [body, setBody] = useState("");

  useEffect(() => {
    getLegalPage({ data: { slug } })
      .then((page) => {
        setTitle(page?.title || "Yasal metin");
        setBody((page?.body || "").trim());
      })
      .catch(() => {
        setTitle("Yasal metin yüklenemedi");
        setBody("Bu sayfa şu anda açılamadı. Lütfen biraz sonra tekrar deneyin.");
      });
  }, [slug]);

  return (
    <article className="space-y-4 pb-16">
      <p className="text-xs font-medium tracking-[0.18em] text-accent uppercase">ZUNOZA AI Video</p>
      <h1 className="font-display text-3xl">{title}</h1>
      <p className="text-sm text-muted">
        ZUNOZA — Yapay Zekâ ile Video, Görsel, Ses ve İçerik Üretim Platformu. Satılan ürünler Premium abonelik ve kredi
        paketleridir; fiziksel kargo yoktur. Fiyatlar Türk Lirası (TRY) ve vergiler dahildir.
      </p>
      {slug === "iletisim" || slug === "hakkimizda" ? <MerchantContact /> : null}
      <div className="whitespace-pre-wrap rounded-2xl border border-border bg-surface p-4 text-sm leading-relaxed text-muted">
        {body || "Yükleniyor…"}
      </div>
      <p className="h-8" aria-hidden />
    </article>
  );
}
