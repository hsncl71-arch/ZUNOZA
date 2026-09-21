import { createFileRoute, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { SIGN_IN_PROVIDERS, authClient, authEnabled, signIn } from "@/lib/auth/client";
import { ZunozaCover } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { acceptRegistrationTerms } from "@/lib/zunoza/privacy";
import { isCanonicalOwnerEmail } from "@/lib/zunoza/owner-email";

export const Route = createFileRoute("/login")({ component: Login });


function oauthMessage(raw: string | null) {
  const text = (raw || "").toLowerCase();
  if (!text) return null;
  if (text.includes("popup") || text.includes("pop-up") || text.includes("blocked")) {
    return "Açılır pencere engellendi. iPhone veya tarayıcıda pencerelere izin verip tekrar deneyin.";
  }
  if (
    text.includes("access_denied") ||
    text.includes("denied") ||
    text.includes("cancel") ||
    text.includes("iptal")
  ) {
    return "Giriş iptal edildi. Hesabınız açılmadı.";
  }
  if (text.includes("state") || text.includes("please_restart")) {
    return "Giriş oturumu zaman aşımına uğradı. Lütfen tekrar deneyin.";
  }
  return "Google, Apple veya X girişi tamamlanamadı. Lütfen tekrar deneyin.";
}

function Login() {
  const { user, isPending } = useCurrentUserState();
  const navigate = useNavigate();
  const searchStr = useRouterState({ select: (s) => s.location.searchStr });
  const [mode, setMode] = useState<"giris" | "kayit">("giris");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [oauthBusy, setOauthBusy] = useState<string | null>(null);
  const [termsOk, setTermsOk] = useState(false);
  const [previewHost, setPreviewHost] = useState(false);
  const redirected = useRef(false);

  useEffect(() => {
    setPreviewHost(window.location.hostname.endsWith(".grok-sandbox.com"));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(searchStr.startsWith("?") ? searchStr : `?${searchStr}`);
    const fromQuery = oauthMessage(params.get("error") || params.get("error_description") || params.get("message"));
    if (fromQuery) {
      setError(fromQuery);
      setOauthBusy(null);
    }
  }, [searchStr]);

  useEffect(() => {
    if (!user || isPending || redirected.current) return;
    redirected.current = true;
    void navigate({ to: "/" });
    const hard = window.setTimeout(() => {
      if (window.location.pathname === "/login") window.location.replace("/");
    }, 600);
    return () => window.clearTimeout(hard);
  }, [user, isPending, navigate]);

  async function onEmail(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "kayit") {
        if (!termsOk) throw new Error("Kayıt için kullanım koşullarını ve gizlilik politikasını kabul edin.");
        if (isCanonicalOwnerEmail(email)) {
          throw new Error("Bu e-posta ile şifreli kayıt açılamaz. Google ile giriş yapın.");
        }
        const { error: err } = await authClient.signUp.email({
          email,
          password,
          name: name.trim() || email.split("@")[0],
        });
        if (err) throw new Error(err.message ?? "Kayıt başarısız.");
        await authClient.getSession();
        await acceptRegistrationTerms().catch(() => undefined);
      } else {
        const { error: err } = await authClient.signIn.email({ email, password });
        if (err) throw new Error("E-posta ya da şifre hatalı.");
      }
      await authClient.getSession();
      window.location.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "İşlem başarısız.");
    } finally {
      setBusy(false);
    }
  }

  async function onOauth(providerId: string) {
    setError(null);
    if (mode === "kayit" && !termsOk) {
      setError("Kayıt için kullanım koşullarını ve gizlilik politikasını kabul edin.");
      return;
    }
    setOauthBusy(providerId);
    const watchdog = window.setTimeout(() => {
      setOauthBusy(null);
      setError("Giriş yönlendirmesi tamamlanamadı. Lütfen tekrar deneyin.");
    }, 18_000);
    try {
      await signIn(providerId, {
        callbackURL: "/",
        errorCallbackURL: "/login?error=oauth",
      });
    } catch (err) {
      const raw = err instanceof Error ? err.message : "";
      setError(oauthMessage(raw) || "Giriş tamamlanamadı. Hesabınız açılmadı.");
      setOauthBusy(nul
... 