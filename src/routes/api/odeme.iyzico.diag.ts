import { createFileRoute } from "@tanstack/react-router";
import { handleIyzicoDiag } from "@/lib/zunoza/payment-http.server";

export const Route = createFileRoute("/api/odeme/iyzico/diag")({
  server: {
    handlers: {
      GET: async ({ request }) => handleIyzicoDiag(request),
      POST: async ({ request }) => handleIyzicoDiag(request),
    },
  },
});
