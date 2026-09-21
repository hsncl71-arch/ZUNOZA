export function PaymentMarks({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`flex flex-col items-center gap-2 ${compact ? "" : "pt-1"}`}>
      <p className="text-center text-[10px] leading-relaxed text-subtle">
        Kart ödemesi iyzico altyapısı üzerinden Visa ve Mastercard ile alınır. Ödeme sayfası HTTPS/TLS ile korunur.
      </p>
      {compact ? (
        <div className="flex max-w-full flex-wrap items-center justify-center gap-2 sm:gap-3">
          <div className="flex h-12 shrink-0 items-center rounded-lg bg-white px-2 py-1">
            <img
              src="/pay/iyzico-ile-ode.svg"
              alt="iyzico ile Öde"
              className="h-9 w-auto max-w-[220px] shrink-0 object-contain"
              height={36}
            />
          </div>
          <div className="flex h-12 shrink-0 items-center rounded-lg bg-white px-2.5 py-1">
            <img src="/pay/visa.svg" alt="Visa" className="h-5 w-auto shrink-0" height={20} width={60} />
          </div>
          <div className="flex h-12 shrink-0 items-center rounded-lg bg-white px-2 py-1">
            <img src="/pay/mastercard.svg" alt="Mastercard" className="h-8 w-auto shrink-0" height={32} width={45} />
          </div>
        </div>
      ) : (
        <div className="w-full max-w-full overflow-x-auto rounded-lg bg-white px-2 py-2">
          <img
            src="/pay/iyzico-logo-band.svg"
            alt="iyzico ile Öde, Visa, Mastercard"
            className="mx-auto h-8 w-auto max-w-full object-contain sm:h-9"
            height={32}
          />
        </div>
      )}
    </div>
  );
}
