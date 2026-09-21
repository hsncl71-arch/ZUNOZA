import { ContractLinks } from "@/components/site-footer";
import { PaymentMarks } from "@/components/payment-marks";

export type CheckoutBuyerDraft = {
  name: string;
  surname: string;
  identityNumber: string;
  gsmNumber: string;
  city: string;
};

export function emptyCheckoutBuyer(displayName?: string | null): CheckoutBuyerDraft {
  const cleaned = String(displayName || "")
    .replace(/[^\p{L}\s'.-]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  const parts = cleaned.split(" ").filter((part) => part.length >= 2);
  return {
    name: parts[0] || "",
    surname: parts.length >= 2 ? parts.slice(1).join(" ") : "",
    identityNumber: "",
    gsmNumber: "",
    city: "",
  };
}

export function CheckoutReview({
  kind,
  name,
  amount,
  extra,
  agreed,
  onAgreed,
  buyer,
  onBuyer,
  saved,
}: {
  kind: "premium" | "kredi";
  name: string;
  amount: string;
  extra?: string;
  agreed: boolean;
  onAgreed: (v: boolean) => void;
  buyer?: CheckoutBuyerDraft;
  onBuyer?: (next: CheckoutBuyerDraft) => void;
  saved?: {
    hasName?: boolean;
    hasIdentity?: boolean;
    hasGsm?: boolean;
    hasCity?: boolean;
    ready?: boolean;
  };
}) {
  function patch(next: Partial<CheckoutBuyerDraft>) {
    if (!buyer || !onBuyer) return;
    onBuyer({ ...buyer, ...next });
  }
  const showName = Boolean(onBuyer && buyer) && !(saved?.hasName && buyer?.name && buyer?.surname);
  const showIdentity = Boolean(onBuyer && buyer) && !saved?.hasIdentity;
  const showGsm = Boolean(onBuyer && buyer) && !saved?.hasGsm;
  const showCity = Boolean(onBuyer && buyer) && !saved?.hasCity;

  return (
    <div className="znz-panel p-4 space-y-3" data-checkout-panel>
      <p className="text-xs font-medium tracking-wide text-accent uppercase">Satın alma özeti</p>
      <p className="text-sm">
        Ürün: <strong>{name}</strong> ({kind === "premium" ? "Premium abonelik" : "Kredi paketi"})
      </p>
      <p className="text-sm">
        Tutar: <strong>{amount}</strong>{" "}
        <span className="text-muted">(TRY, vergiler dahil)</span>
      </p>
      {extra ? <p className="text-xs text-muted">{extra}</p> : null}
      <p className="text-xs text-muted">
        Dijital AI hizmetidir; kargo yoktur. Kart bilgisi ZUNOZA’da toplanmaz. iyzico, ödeme başlatmak için TCKN,
        telefon ve il ister.
      </p>
      {onBuyer && buyer ? (
        <div className="grid gap-2">
          {showName ? (
            <div className="grid grid-cols-2 gap-2">
              <label className="grid gap-1">
                <span className="text-xs text-muted">Ad</span>
                <input
                  className="znz-field min-h-11"
                  autoComplete="given-name"
                  value={buyer.name}
                  onChange={(e) => patch({ name: e.target.value })}
                />
              </label>
              <label className="grid gap-1">
                <span className="text-xs text-muted">Soyad</span>
                <input
                  className="znz-field min-h-11"
                  autoComplete="family-name"
                  value={buyer.surname}
                  onChange={(e) => patch({ surname: e.target.value })}
                />
              </label>
            </div>
          ) : null}
          {showIdentity ? (
            <label className="grid gap-1">
              <span className="text-xs text-muted">T.C. Kimlik Numarası</span>
              <input
                className="znz-field min-h-11"
                inputMode="numeric"
                autoComplete="off"
                maxLength={11}
                value={buyer.identityNumber}
                onChange={(e) => patch({ identityNumber: e.target.value.replace(/\D/g, "").slice(0, 11) })}
              />
            </label>
          ) : (
            <p className="text-xs text-muted">Kayıtlı TCKN kullanılacak.</p>
          )}
          {showGsm ? (
            <label className="grid gap-1">
              <span className="text-xs text-muted">Cep telefonu</span>
              <input
                className="znz-field m
... 