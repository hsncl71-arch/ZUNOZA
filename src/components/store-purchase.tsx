import { useState } from "react";
import { Button } from "@/components/ui/button";
import { storeProductForPackage } from "@/lib/zunoza/store-billing";
import { nativeStore } from "@/lib/zunoza/native-platform";
import { purchaseNativePackage, restoreNativePurchases } from "@/lib/zunoza/native-iap";

export function StorePurchasePanel({ packageId, name }: { packageId: string; name: string }) {
  const product = storeProductForPackage(packageId);
  const store = nativeStore();
  const code = store === "ios" ? product?.appleProductId : product?.googleProductId;
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function buy() {
    if (busy) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await purchaseNativePackage(packageId);
      setMsg(res.message);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Mağaza satın alması tamamlanamadı.");
    } finally {
      setBusy(false);
    }
  }

  async function restore() {
    if (busy) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await restoreNativePurchases();
      setMsg(res.message);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Satın almalar geri yüklenemedi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="znz-panel space-y-3 p-4" data-store-checkout="1">
      <p className="text-sm text-fg">
        {name} satın alımı {store === "ios" ? "App Store" : "Google Play"} içinden yapılır. Web’deki iyzico bu uygulamada kullanılmaz.
      </p>
      {code ? <p className="text-xs text-muted">Mağaza ürün kodu: {code}</p> : null}
      <Button type="button" className="w-full rounded-full" disabled={busy || !product} onClick={() => void buy()}>
        {busy ? "Mağaza kontrol ediliyor…" : "Mağaza içi satın al"}
      </Button>
      <Button type="button" variant="ghost" className="w-full rounded-full" disabled={busy} onClick={() => void restore()}>
        Satın almaları geri yükle
      </Button>
      {msg ? <p className="text-xs text-subtle">{msg}</p> : (
        <p className="text-xs text-subtle">
          Apple / Google ürünleri onaylanmadan kredi yüklenmez. Web’deki iyzico akışı durur.
        </p>
      )}
    </div>
  );
}
