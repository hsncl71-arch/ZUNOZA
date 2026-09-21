import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppGate } from "@/components/gate";
import { Button } from "@/components/ui/button";
import { listPricing, updatePricing, listPackages, getCreditCampaign, updateCreditCampaign } from "@/lib/zunoza/api";
import { listAdminPayments } from "@/lib/zunoza/payments";
import { useBootstrap } from "@/components/bootstrap";
import { ScreenLoader } from "@/components/screen-loader";
import { listAdminPremiumPlans, updatePremiumPlan } from "@/lib/zunoza/premium";
import { getLegalCompany, listLegalPages, updateLegalCompany, updateLegalPage } from "@/lib/zunoza/legal";
import { replayWelcomeScreen } from "@/components/welcome-screen";
import { listAdminPrivacyRequests, listRetentionSettings, updatePrivacyRequestStatus } from "@/lib/zunoza/privacy";
import {
  adjustAdminCredits,
  createAnnouncement,
  getAdminOverview,
  getAdminServices,
  getAdminUsage,
  getCostCaps,
  updateCostCaps,
  listAdminUsers,
  listAnnouncements,
  listAuditLog,
  listStudioSettings,
  listSupportTickets,
  scanTestAccounts,
  deleteTestAccounts,
  auditRoles,
  setAnnouncementActive,
  updateAdminPackage,
  updateAdminUser,
  updateStudioSetting,
  updateSupportTicket,
  getAssistantVoice,
  updateAssistantVoice,
  getFounderProfile,
  updateFounderProfile,
  getEconomyAdmin,
  getActualCostCenter,
  updateEconomySettings,
  updateFeatureCreditRule,
} from "@/lib/zunoza/admin";
import { deleteShowcaseClip, listAdminShowcase, upsertShowcaseClip } from "@/lib/zunoza/showcase-api";
import type { ShowcaseClip } from "@/lib/zunoza/showcase";

export const Route = createFileRoute("/yonetici")({ component: Page });

const TABS = [
  "Genel",
  "Kullanıcılar",
  "Paketler",
  "Stüdyolar",
  "Vitrin",
  "Ödemeler",
  "Destek",
  "Duyuru",
  "Servis",
  "Maliyet",
  "Kayıt",
  "Yasal",
] as const;

type Tab = (typeof TABS)[number];

function Page() {
  return (
    <AppGate>
      <Admin />
    </AppGate>
  );
}

function Admin() {
  const { data } = useBootstrap();
  const [tab, setTab] = useState<Tab>("Genel");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  if (!data) return <ScreenLoader label="Yönetici oturumu kontrol ediliyor" />;
  if (!data.isAdmin) return <p>Bu sayfa yalnızca yöneticiler içindir.</p>;

  function flash(ok: string) {
    setErr(null);
    setMsg(ok);
  }

  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl">Yönetici</h1>
      <div className="chip-row">
        {TABS.map((item) => (
          <button
            key={item}
            type="button"
            className={`chip ${tab === item ? "is-on" : ""}`}
            onClick={() => setTab(item)}
          >
            {item}
          </button>
        ))}
      </div>
      {tab === "Genel" ? <Overview onOk={flash} onErr={setErr} /> : null}
      {tab === "Kullanıcılar" ? <Users onOk={flash} onErr={setErr} /> : null}
      {tab === "Paketler" ? (
        <>
          <PremiumPlansAdmin onOk={flash} onErr={setErr} />
          <CreditCampaignAdmin onOk={flash} onErr={setErr} />
          <Packages onOk={flash} onErr={setErr} />
        </>
      ) : null}
      {tab === "Stüdyolar" ? (
        <>
          <AssistantVoiceAdmin onOk={flash} onErr={setErr} />
          <FounderProfileAdmin onOk={flash} onErr={setErr} />
          <Studios onOk={flash} onErr={setErr} />
        </>
      ) : null}
      {tab === "Vitrin" ? <ShowcaseAdmin onOk={flash} onErr={setErr} /> : null}
      {tab === "Ödemeler" ? <Payments /> : null}
      {tab === "Destek" ? (
        <>
          <Tickets onOk={flash} onErr={setErr} />
          <PrivacyInbox onOk={flash} onErr={setErr} />
        </>
      ) : null}
      {tab === "Duyuru" ? <Notices onOk={flash} onErr={setErr} /> : null}
      {tab === "Servis" ? <Services /> : null}
      {tab === "Maliyet" ? <CostPanel onOk={flash} onErr={setErr} /> : null}
      {tab === "Kayıt" ? <Audit /> : null}
      {tab === "Yasal" ? <LegalAdmin onOk={flash} onErr={setErr} /> : null}
      {msg ? <p className="text-sm text-ok">{msg}</p> : null}
      {err ? <p className="text-sm text-danger">{err}</p> : null}
    </div>
  );
}

function Overview({ onOk, onErr }: { onOk: (s: string) => void; onErr: (s: string) => void }) {
  const [stats, setStats] = useState<Awaited<ReturnType<typeof getAdminOverview>> | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    getAdminOverview().then(setStats).catch(() => setStats(null));
  }, []);
  const items = [
    ["Kullanıcı", stats?.users],
    ["Video", stats?.videos],
    ["Görsel", stats?.images],
    ["Müzik", stats?.music],
    ["TTS", stats?.tts],
    ["Montaj", stats?.montages],
    ["Kredi kullanılan", stats?.creditsUsed],
    ["Kredi yüklenen", stats?.creditsGranted],
    ["Destek", stats?.tickets],
  ];
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {items.map(([label, value]) => (
          <div key={String(label)} className="rounded-2xl border border-border bg-surface px-3 py-3">
            <p className="text-[11px] uppercase tracking-wider text-muted">{label}</p>
            <p className="mt-1 text-xl tabular-nums">{value ?? "—"}</p>
          </div>
        ))}
      </div>
      <Button
        variant="secondary"
        disabled={busy}
        onClick={() => {
          setBusy(true);
          void replayWelcomeScreen()
            .then(() => onOk("Karşılama ekranı sıfırlandı."))
            .catch((err) => onErr(err instanceof Error ? err.message : "Sıfırlanamadı"))
            .finally(() => setBusy(false));
        }}
      >
        Karşılama ekranını sıfırla
      </Button>
    </div>
  );
}

function Users({ onOk, onErr }: { onOk: (s: string) => void; onErr: (s: string) => void }) {
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<Awaited<ReturnType<typeof listAdminUsers>>>([]);
  const [packages, setPackages] = useState<Awaited<ReturnType<typeof listPackages>>>([]);
  async function load(q = query) {
    const list = await listAdminUsers({ data: { query: q } });
    setRows(list);
  }
  useEffect(() => {
    load().catch(() => setRows([]));
    listPackages().then(setPackages).catch(() => setPackages([]));
    // eslint-disable-next-line r
... 