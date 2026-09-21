import { createFileRoute } from "@tanstack/react-router";
import {
  iyzicoConfigured,
  iyzicoRuntimeMode,
  iyzicoBaseUrl,
  iyzicoKeyLooksSandbox,
  initializeCheckoutForm,
} from "@/lib/zunoza/iyzico.server";

function isLocalProbe(request: Request) {
  const host = (request.headers.get("host") || "").split(":")[0] || "";
  const fwd = (request.headers.get("x-forwarded-host") || "").split(":")[0] || "";
  if (fwd && !/^(localhost|127\.0\.0\.1)$/i.test(fwd)) return false;
  return /^(localhost|127\.0\.0\.1)$/i.test(host);
}

export const Route = createFileRoute("/api/odeme/iyzico/health")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const local = isLocalProbe(request);
        const envNames = Object.keys(process.env)
          .filter((k) => /iyzi|pay|secret|api_key|auth_url|app_url|grok_project|database/i.test(k))
          .sort();
        const base = {
          configured: iyzicoConfigured(),
          mode: iyzicoRuntimeMode(),
          sandboxKey: iyzicoKeyLooksSandbox(),
          baseUrl: iyzicoBaseUrl(),
          envNames,
          hasApi: Boolean(process.env.IYZICO_API_KEY?.trim()),
          hasSecret: Boolean(process.env.IYZICO_SECRET_KEY?.trim()),
          hasBase: Boolean(process.env.IYZICO_BASE_URL?.trim()),
        };
        if (url.searchParams.get("init") === "1") {
          if (!local) return new Response("not found", { status: 404 });
          if (!iyzicoConfigured()) {
            return Response.json({ ...base, init: "not-configured" });
          }
          const init = await initializeCheckoutForm({
            conversationId: `probe-${Date.now()}`,
            callbackUrl: "https://lunar-sapphire-honey-able.grok.me/api/odeme/iyzico/callback",
            priceTry: 1,
            basketId: "probe-pack",
            itemName: "Kredi paketi",
            buyerId: "probe-user",
            buyerName: "Hasan",
            buyerSurname: "Ocal",
            email: "hasan@example.com",
            ip: "1.2.3.4",
          });
          return Response.json({
            ...base,
            initStatus: init.status || null,
            errorCode: init.errorCode || null,
            errorGroup: init.errorGroup || null,
            errorMessage: init.errorMessage || null,
            hasToken: Boolean(init.token),
            hasPage: Boolean(init.paymentPageUrl),
          });
        }
        return Response.json(base);
      },
        const init = await initializeCheckoutForm({
          conversationId: `probe-${Date.now()}`,
          callbackUrl: "https://lunar-sapphire-honey-able.grok.me/api/odeme/iyzico/callback",
          priceTry: 1,
          basketId: "probe-pack",
          itemName: "Kredi paketi",
          buyerId: "probe-user",
          buyerName: "Hasan",
          buyerSurname: "Ocal",
          email: "hasan@example.com",
          ip: "1.2.3.4",
        });
        return Response.json({
          ...base,
          initStatus: init.status || null,
          errorCode: init.errorCode || null,
          errorGroup: init.errorGroup || null,
          errorMessage: init.errorMessage || null,
          hasToken: Boolean(init.token),
          hasPage: Boolean(init.paymentPageUrl),
        });
      },
    },
  },
});
