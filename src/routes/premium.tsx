import { createFileRoute, Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import { GuestShell } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { listPremiumPlans, type PremiumPlan } from "@/lib/zunoza/premium";
import { getCheckoutBuyer, getPaymentStatus, retryMyOpenPayments, startPremiumPayment } from "@/lib/zunoza/payments";
import { PaymentOutcome, type PaymentOutcomeKind } from "@/components/payment-result";
import { useBootstrap } from "@/components/bootstrap";
import { CheckoutReview, emptyCheckoutBuyer } from "@/components/checkout-review";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export const Route = createFileRoute("/premium")({ component: Page });

const SUB_IDS = ["weekly", "monthly", "sixmo", "yearly"] as const;
const PERKS = [
  "Gelişmiş yapay zekâ video üretimi",
  "Sinematik AI efektleri",
  "Gelişmiş düzenleme",
  "Pakete dahil kullanım hakkı",
];

function money(value: number) {
  return value.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function Page() {
  const { user, isPending } = useCurrentUserState();
  const inner = <PremiumScreen signedIn={Boolean(user)} />;
  if (user) return inner;
  return <GuestShell showSignIn={!isPending}>{inner}</GuestShell>;
}

function PremiumScreen({ signedIn }: { signedIn: boolean }) {
  const { refresh } = useBootstrap();
  const { user } = useCurrentUserState();
  const searchStr = useRouterState({ select: (s) => s.location.searchStr });
  const odemeFlag = new URLSearchParams(searchStr.startsWith("?") ? searchStr : `?${searchStr}`).get("odeme");
  const [plans, setPlans] = useState<PremiumPlan[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [buyer, setBuyer] = useState(() => emptyCheckoutBuyer(user?.displayName));
  const [savedBuyer, setSavedBuyer] = useState<{
    hasName: boolean;
    hasIdentity: boolean;
    hasGsm: boolean;
    hasCity: boolean;
    ready: boolean;
  } | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<{
    kind: PaymentOutcomeKind;
    packageName?: string;
    credits?: number;
    balance?: number | null;
  } | null>(null);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const payLock = useRef(false);

  useEffect(() => {
    if (!user?.displayName) return;
    setBuyer((prev) => {
      if (prev.name || prev.surname) return prev;
      const seeded = emptyCheckoutBuyer(user.displayName);
      return { ...prev, name: seeded.name, surname: seeded.surname };
    });
  }, [user?.displayName]);

  useEffect(() => {
    listPremiumPlans()
      .then((rows) => {
        setPlans(rows);
        let wanted: string | null = null;
        try {
          wanted = sessionStorage.getItem("zunoza.premiumPlan");
        } catch {
          wanted = null;
        }
        const params = new URLSearchParams(searchStr.startsWith("?") ? searchStr : `?${searchStr}`);
        const fromUrl = params.get("plan");
        setSelected((prev) => {
          const pick = fromUrl || wanted || prev;
          const pool = rows.filter((row) => (SUB_IDS as readonly string[]).includes(row.id));
          if (pick && pool.some((row) => row.id === pick)) return pick;
          return pool.find((row) => row.badge)?.id || pool[0]?.id || null;
        });
      })
      .catch(() => setErr("Premium paketler yüklenemedi. Lütfen sayfayı yenileyin."))
      .finally(() => setLoadingPlans(false));
    if (signedIn) {
      getPaymentStatus().catch(() => undefined);
      getCheckoutBuyer()
        .then((row) => {
          setSavedBuyer({
            hasName: row.hasName,
            hasIdentity: row.hasIdentity,
            hasGsm: row.hasGsm,
            hasCity: row.hasCity,
            ready: row.ready,
          });
          setBuyer((prev) => ({
            ...prev,
            name: prev.name || row.name,
            surname: prev.surname || row.surname,
            city: prev.city || row.city,
          }));
        })
        .catch(() => undefined);
    }
  }, [signedIn, searchStr]);

  useEffect(() => {
    let cancelled = false;
    function applyFlag() {
      if (odemeFlag === "basarili") {
        setOutcome((prev) => prev ?? { kind: "success" });
        setErr(null);
        refresh();
      } else if (odemeFlag === "banka") {
        setOutcome({ kind: "bank" });
        setErr(null);
      } else if (odemeFlag === "iptal") {
        setOutcome({ kind: "cancel" });
        setErr(null);
      } else if (odemeFlag === "beklemede" || odemeFlag === "basarisiz") {
        setOutcome({ kind: "pending" });
        setErr(null);
      }
    }
    if (!signedIn) {
      applyFlag();
      return;
    }
    retryMyOpenPayments()
      .then((res) => {
        if (cancelled) return;
        if (res.ok) {
          setOutcome({
            kind: "success",
            packageName: res.packageName,
            credits: res.credits,
            balance: res.balance,
          });
          setErr(null);
          refresh();
          return;
        }
        applyFlag();
      })
      .catch(() => {
        if (!cancelled) applyFlag();
      });
    return () => {
      cancelled = true;
    };
  }, [odemeFlag, refresh, signedIn]);

  const subs = useMemo(() => {
    const rank = new Map(SUB_IDS.map((id, i) => [id, i]));
    return plans
      .filter((p) => rank.has(p.id as (typeof SUB_IDS)[number]))
      .sort((a, b) => (rank.get(a.id as (typeof SUB_IDS)[number]) ?? 9) - (rank.get(b.id as (typeof SUB_IDS)[number]) ?? 9));
  }, [plans]);
  const current = useMemo(() => subs.find((p) => p.id === selected) || subs[0], [subs, selected]);
  useEffect(() => {
    setAgreed(false);
  }, [current?.id]);

  async function continuePay() {
    if (!current) return;
    if (!signedIn) return;
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const res = await startPremiumPayment({ data: { planId: current.id } });
      if (typeof res.checkoutUrl === "string" && res.checkoutUrl.startsWith("https://")) {
        window.location.href = res.checkoutUrl;
        return;
      }
      throw new Error("Ödeme ekranı şu anda açılamadı. Lütfen tekrar deneyin.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Ödeme ekranı şu anda açılamadı. Lütfen tekrar deneyin.");
      setBusy(false);
    }
  }

  return (
    <div className="relative -mx-3 min-h-[80dvh] overflow-hidden px-3 pb-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(107,116,255,0.28),transparent_42%),radial-gradient(circle_at_90%_10%,rgba(42,61,255,0.22),transparent_38%)]" />
      <div className="relative mx-auto max-w-md space-y-6 pt-6">
        <div>
          <p className="flex items-center gap-2 text-xs font-medium tracking-[0.18em] text-accent uppercase">
            <Crown className="size-3.5" />
            ZUNOZA Premium
          </p>
          <h1 className="mt-2 font-display text-4xl leading-tight">
            Yapay zekâ stüdyonu
            <span className="block text-accent">Premium’a taşı</span>
          </h1>
          <p className="mt-2 text-sm text-muted">{current?.description || "Yönetici panelinden tanımlanan Premium paketler."}</p>
          <p className="mt-1 text-xs text-subtle">
            Dijital AI stüdyo erişimidir; kargo yoktur. Para birimi TRY. Fiyatlar vergiler dahildir. Gizli ücret yoktur.
            Süre, seçilen paketin dönem etiketine göredir.
          </p>
        </div>

        {outcome ? (
          <PaymentOutcome
            kind={outcome.kind}
            packageName={outcome.packageName}
            credits={outcome.credits}
            balance={outcome.balance}
            premium
          />
        ) : null}

        {current?.features.length ? (
          <ul className="grid grid-cols-2 gap-2 text-sm">
            {current.features.map((line) => (
              <li key={line} className="flex items-start gap-2 text-fg">
                <Sparkles className="mt-0.5 size-3.5 shrink
... 