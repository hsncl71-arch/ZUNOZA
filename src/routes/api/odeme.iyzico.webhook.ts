import { createFileRoute } from "@tanstack/react-router";
import { handleIyzicoWebhook } from "@/lib/zunoza/payment-http";

export const Route = createFileRoute("/api/odeme/iyzico/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => handleIyzicoWebhook(request),
    },
  },
});
