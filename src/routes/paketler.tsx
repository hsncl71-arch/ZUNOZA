import { createFileRoute, Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import { GuestShell } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { getCreditCampaign, listPackages } from "@/lib/zunoza/api";
import { CheckoutReview, emptyCheckoutBuyer } from "@/components/checkout-review";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { getCheckoutBuyer, getPaymentStatus, retryMyOpenPayments, startPackagePayment } from "@/lib/zunoza/payments";
import { PaymentOutcome, type PaymentOutcomeKind } from "@/components/payment-result";
import { payablePackageTry } from "@/lib/zunoza/package-price";
import { useBootstrap } from "@/components/bootstrap";
import { DEFAULT_VIDEO_CREDIT_TABLE } from "@/lib/zunoza/credit-economy";
import { friendlyClientError } from "@/lib/zunoza/client-error";

export const Route = createFileRoute("/paketler")({
  component: Page,
});

function packYield(credits: number) {
  const e5 = Math.floor(credits / (DEFAULT_VIDEO_CREDIT_TABLE["5"]?.ekonomik || 3));
  const s10 = Math.floor(credits / (DEFAULT_VIDEO_CREDIT_TABLE["10"]?.standart || 10));
  const s15 = Math.floor(credits / (DEFAULT_VIDEO_CREDIT_TABLE["15"]?.standart || 15));
  const parts: string[] = [];
  if (e5) parts.push(`${e5} ekonomik (5 sn)`);
  if (s10) parts.push(`${s10} standart (10 sn)`);
  if (s15) parts.push(`${s15} standart (15 sn)`);
  return parts.length ? `≈ ${parts.join(" · ")} video` : null;
}

function money(value: number) {
  return value.toLocaleString("tr-TR", { maximumFractionDigits: 0 });
}

function moneyPlan(value: number) {
  return value.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function openPremiumPlan(id: string) {
  try {
    sessionStorage.setItem("zunoza.premiumPlan", id);
  } catch {
    /* ignore */
  }
}

function checkoutHref(url: unknown) {
  if (typeof url !== "string") return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return null;
    return parsed.href;
  } catch {
    return null;
  }
}

function payStartError(err: unknown) {
  const msg = friendlyClientError(err, "Ödeme ekranı şu anda açılamadı. Lütfen tekrar deneyin.");
  if (/secret|api[_-]?key|authorization|iyziwsv|stack|ECONN|ENOENT/i.test(msg)) {
    return "Ödeme ekranı şu anda açılamadı. Lütfen tekrar deneyin.";
  }
  return msg.slice(0, 180) || "Ödeme ekranı şu anda açılamadı. Lütfen tekrar deneyin.";
}

function Page() {
  const { user, isPending } = useCurrentUserState();
  const inner = <CreditShop signedIn={Boolean(user)} />;
  if (user) return inner;
  return <GuestShell showSignIn={!isPending}>{inner}</GuestShell>;
}

function CreditShop({ signedIn }: { signedIn: boolean }) {
  const { refresh } = useBootstrap();
  const { user } = useCurrentUserState();
  const searchStr = useRouterState({ select: (s) => s.location.searchStr });
  const odemeFlag = new URLSearchParams(searchStr.startsWith("?") ? searchStr : `?${searchStr}`).get("odeme");
  const [rows, setRows] = useState<Awaited<ReturnType<typeof listPackages>>>([]);
  const [plans, setPlans] = useState<PremiumPlan[]>([]);
  const [campaign, setCampaign] = useState<Awaited<ReturnType<typeof getCreditCampaign>> | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<{
    kind: PaymentOutcomeKind;
    packageName?: string;
    credits?: number;
    balance?: number | null;
  } | null>(null);
  const [pick, setPick] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [buyer, setBuyer] = useState(() => emptyCheckoutBuyer(user?.displayName));
  const [savedBuyer, setSavedBuyer] = useState<{
    hasName: boolean;
    hasIdentity: boolean;
    hasGsm: boolean;
    hasCity: boolean;
    ready: boolean;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [loadingPacks, setLoadingPacks] = useState(true);
  const pickRef = useRef<HTMLElement | null>(null);
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
    if (!user?.displayName) return;
    setBuyer((prev) => {
      if (prev.name || prev.surname) return prev;
      return { ...prev, ...emptyCheckoutBuyer(user.displayName), identityNumber: prev.identityNumber, gsmNumber: prev.gsmNumber, city: prev.city };
    });
  }, [user?.displayName]);

  useEffect(() => {
    listPackages()
      .then(setRows)
      .catch(() => setErr("Paketler yüklenemedi. Lütfen sayfayı yenileyin."))
      .finally(() => setLoadingPacks(false));
    listPremiumPlans().then(setPlans).catch(() => setPlans([]));
    getCreditCampaign().then(setCampaign).catch(() => setCampaign(null));
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
  }, [signedIn]);

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

  useEffect(() => {
  
... 