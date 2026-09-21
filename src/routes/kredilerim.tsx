import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppGate } from "@/components/gate";
import { ScreenLoader } from "@/components/screen-loader";
import { StudioHead } from "@/components/studio-head";
import { listLedger } from "@/lib/zunoza/api";
import { listMyPayments, retryMyOpenPayments } from "@/lib/zunoza/payments";
import { formatDate } from "@/routes/videolarim";
import { PaymentOutcome } from "@/components/payment-result";
import { useBootstrap } from "@/components/bootstrap";

export const Route = createFileRoute("/kredilerim")({ component: Page });

function statusLabel(status: string) {
  if (status === "basarili") return "Başarılı";
  if (status === "bekliyor") return "Doğrulanıyor";
  if (status === "iade" || status === "chargeback") return "İade";
  if (status === "basarisiz") return "Tamamlanamadı";
  return status;
}

function Page() {
  return (
    <AppGate>
      <Ledger />
    </AppGate>
  );
}

function Ledger() {
  const { refresh, data } = useBootstrap();
  const [rows, setRows] = useState<Awaited<ReturnType<typeof listLedger>>>([]);
  const [payments, setPayments] = useState<Awaited<ReturnType<typeof listMyPayments>>>([]);
  const [credited, setCredited] = useState<{ packageName?: string; credits?: number; balance?: number | null } | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    Promise.all([listLedger().catch(() => []), listMyPayments().catch(() => [])])
      .then(([ledger, pays]) => {
        setRows(ledger);
        setPayments(pays);
      })
      .finally(() => setLoading(false));
    retryMyOpenPayments()
      .then((res) => {
        if (!res.ok) return;
        setCredited({ packageName: res.packageName, credits: res.credits, balance: res.balance });
        refresh();
        listMyPayments().then(setPayments).catch(() => undefined);
        listLedger().then(setRows).catch(() => undefined);
      })
      .catch(() => undefined);
  }, [refresh]);
  return (
    <div className="space-y-5">
      <StudioHead kicker="Hesap" title="Kredi hareketleri" />
      <Link to="/paketler" className="text-accent">
        Satın Al
      </Link>
      {credited ? (
        <PaymentOutcome
          kind="success"
          packageName={credited.packageName}
          credits={credited.credits}
          balance={credited.balance ?? data?.balance ?? null}
        />
      ) : null}

      <section className="znz-panel space-y-3 p-4">
        <h2 className="studio-section">Ödemelerim</h2>
        {loading ? <ScreenLoader label="Ödemeler yükleniyor" /> : null}
        {!loading && payments.length === 0 ? <p className="text-sm text-muted">Henüz ödeme kaydı yok.</p> : null}
        <ul className="space-y-2">
          {payments.map((p) => (
            <li key={p.id} className="znz-panel px-4 py-3 text-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{p.packageName}</p>
                  <p className="text-xs text-muted">
                    ₺{Number(p.priceTry).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{" "}
                    · {p.credits.toLocaleString("tr-TR")} kredi
                  </p>
                  <p className="text-[11px] text-subtle">İşlem no: {p.publicRef}</p>
                </div>
                <div className="text-right">
                  <p className={p.status === "basarili" ? "text-ok" : "text-muted"}>{statusLabel(p.status)}</p>
                  <p className="text-xs text-subtle">{formatDate(p.createdAt)}</p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="znz-panel space-y-3 p-4">
        <h2 className="studio-section">Kredi hareketleri</h2>
        {loading ? null : rows.length === 0 ? <p className="text-muted">Henüz kredi hareketi yok.</p> : null}
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.id} className="znz-panel px-4 py-3 text-sm">
            <span className={r.amount >= 0 ? "text-ok" : "text-danger"}>
              {r.amount > 0 ? "+" : ""}
              {r.amount}
            </span>{" "}
            <span className="text-muted">{r.note ?? r.kind}</span>
         
... 