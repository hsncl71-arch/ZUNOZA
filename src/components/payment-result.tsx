import { CheckCircle2, Clock3, ShieldX, CircleSlash } from "lucide-react";
import { Link } from "@tanstack/react-router";

export type PaymentOutcomeKind = "success" | "pending" | "bank" | "cancel";

export function PaymentOutcome({
  kind,
  packageName,
  credits,
  balance,
  premium,
}: {
  kind: PaymentOutcomeKind;
  packageName?: string;
  credits?: number;
  balance?: number | null;
  premium?: boolean;
}) {
  if (kind === "success") {
    const pack = packageName?.trim() || (premium ? "Premium paket" : "Kredi paketi");
    return (
      <div
        className="rounded-[1.6rem] border border-ok/50 bg-surface p-5 shadow-[0_0_24px_rgba(34,197,94,0.12)]"
        data-payment-outcome="success"
      >
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 size-6 shrink-0 text-ok" />
          <div className="space-y-1.5">
            <p className="text-base font-semibold text-ok">Ödemeniz başarıyla alındı.</p>
            <p className="text-sm">{pack} hesabınıza tanımlandı.</p>
            {credits && credits > 0 ? (
              <p className="text-sm">
                {credits.toLocaleString("tr-TR")} kredi hesabınıza yüklendi.
              </p>
            ) : (
              <p className="text-sm">Paketiniz hesabınıza tanımlandı.</p>
            )}
            {balance != null ? (
              <p className="text-sm text-muted">Güncel bakiyeniz: {balance.toLocaleString("tr-TR")} kredi.</p>
            ) : null}
            <p className="text-sm text-muted">Paketinizi iyi günlerde kullanın.</p>
            <Link to="/kredilerim" className="inline-block pt-1 text-sm text-accent">
              Ödeme geçmişi
            </Link>
          </div>
        </div>
      </div>
    );
  }
  if (kind === "pending") {
    return (
      <div className="rounded-[1.6rem] border border-accent/40 bg-surface p-5" data-payment-outcome="pending">
        <div className="flex items-start gap-3">
          <Clock3 className="mt-0.5 size-6 shrink-0 text-accent" />
          <div className="space-y-1">
            <p className="text-base font-semibold">Ödemeniz alındı. Paketiniz doğrulanıyor.</p>
            <p className="text-sm text-muted">
              Banka onayı tamamlandıysa krediniz kısa süre içinde hesabınıza işlenir. Sayfayı yenilemeniz gerekmez;
              birkaç saniye içinde bakiyeniz güncellenir.
            </p>
          </div>
        </div>
      </div>
    );
  }
  if (kind === "bank") {
    return (
      <div className="rounded-[1.6rem] border border-danger/40 bg-surface p-5" data-payment-outcome="bank">
        <div className="flex items-start gap-3">
          <ShieldX className="mt-0.5 size-6 shrink-0 text-danger" />
          <div>
            <p className="text-base font-semibold">Ödeme bankanız tarafından onaylanmadı.</p>
            <p className="mt-1 text-sm text-muted">Kartınızdan çekim yapılmadı. Başka bir kartla tekrar deneyebilirsiniz.</p>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="rounded-[1.6rem] border border-border bg-surface p-5" data-payment-outcome="cancel">
      <div className="flex items-start gap-3">
        <CircleSlash className="mt-0.5 size-6 shrink-0 text-muted" />
        <div>
          <p className="text-base font-semibold">Ödeme iptal edildi.</p>
          <p className="mt-1 text-sm text-muted">İşlem tamamlanmadı. İstediğiniz zaman yeniden deneyebilirsiniz.</p>
        </div>
      </div>
    </div>
  );
}
