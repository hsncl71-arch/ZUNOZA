import { createFileRoute } from "@tanstack/react-router";
import { handleIyzicoCallback } from "@/lib/zunoza/payment-http";

export const Route = createFileRoute("/api/odeme/iyzico/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => handleIyzicoCallback(request),
      POST: async ({ request }) => handleIyzicoCallback(request),
    },
  },
});
