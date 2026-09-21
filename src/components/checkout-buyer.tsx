export function CheckoutBuyerFields({
  name,
  surname,
  identityNumber,
  gsmNumber,
  city,
  disabled,
  onName,
  onSurname,
  onIdentity,
  onGsm,
  onCity,
}: {
  name: string;
  surname: string;
  identityNumber: string;
  gsmNumber: string;
  city: string;
  disabled?: boolean;
  onName: (value: string) => void;
  onSurname: (value: string) => void;
  onIdentity: (value: string) => void;
  onGsm: (value: string) => void;
  onCity: (value: string) => void;
}) {
  return (
    <div className="space-y-3 rounded-2xl border border-border bg-elevated/40 p-4">
      <p className="text-xs font-medium tracking-wide text-accent uppercase">Fatura bilgileri</p>
      <p className="text-xs text-muted">
        iyzico yasal doğrulama için ad, soyad, T.C. Kimlik Numarası, cep telefonu ve il ister. Bu bilgiler ZUNOZA
        hesabınıza kaydedilmez; yalnızca bu ödeme isteğinde kullanılır.
      </p>
      <label className="block text-xs text-muted">
        Ad
        <input
          type="text"
          autoComplete="given-name"
          disabled={disabled}
          value={name}
          maxLength={50}
          onChange={(e) => onName(e.target.value)}
          className="mt-1 min-h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-fg"
        />
      </label>
      <label className="block text-xs text-muted">
        Soyad
        <input
          type="text"
          autoComplete="family-name"
          disabled={disabled}
          value={surname}
          maxLength={50}
          onChange={(e) => onSurname(e.target.value)}
          className="mt-1 min-h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-fg"
        />
      </label>
      <label className="block text-xs text-muted">
        T.C. Kimlik Numarası
        <input
          type="text"
          inputMode="numeric"
          autoComplete="off"
          disabled={disabled}
          value={identityNumber}
          maxLength={11}
          onChange={(e) => onIdentity(e.target.value.replace(/\D/g, "").slice(0, 11))}
          className="mt-1 min-h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm tracking-[0.18em] text-fg"
        />
      </label>
      <label className="block text-xs text-muted">
        Cep telefonu
        <input
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          disabled={disabled}
          value={gsmNumber}
          maxLength={16}
          placeholder="05xx xxx xx xx"
          onChange={(e) => onGsm(e.target.value.replace(/[^\d+]/g, "").slice(0, 16))}
          className="mt-1 min-h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-fg"
        />
      </label>
      <label className="block text-xs text-muted">
        İl
        <input
          type="text"
          autoComplete="address-level1"
          disabled={disabled}
          value={city}
          maxLength={40}
          placeholder="Kırıkkale"
          onChange={(e) => onCity(e.target.value)}
          className="mt-1 min-h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-fg"
        />
      </label>
    </div>
  );
}
