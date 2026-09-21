import { createFileRoute } from "@tanstack/react-router";
import { handleOAuthStartRequest } from "@/lib/auth/oauth-start.server";

export const Route = createFileRoute("/auth/start")({
  server: {
    handlers: {
      GET: ({ request }) => handleOAuthStartRequest(request),
    },
  },
});
