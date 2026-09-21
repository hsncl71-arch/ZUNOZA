import { createFileRoute } from "@tanstack/react-router";
import { getSessionUser } from "@/lib/auth/verify.server";
import { assertSameSiteRequest } from "@/lib/auth/isolation.server";
import { assistantSseResponse } from "@/lib/zunoza/assistant-stream.server";
import type { ChatMessage } from "@/lib/zunoza/assistant";

export const Route = createFileRoute("/api/asistan-akisi")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          assertSameSiteRequest();
        } catch {
          return new Response("Forbidden", { status: 403 });
        }
        const authHeader = request.headers.get("authorization");
        const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
        const user = await getSessionUser(bearer);
        if (!user) return new Response("Unauthorized", { status: 401 });
        const length = Number(request.headers.get("content-length") || 0);
        if (length > 2_500_000) return Response.json({ error: "İstek çok büyük." }, { status: 413 });
        const body = (await request.json().catch(() => null)) as {
          messages?: ChatMessage[];
          nowIso?: string;
          timeZone?: string;
        } | null;
        if (!body || !Array.isArray(body.messages) || body.messages.length > 16) {
          return Response.json({ error: "Bir mesaj yazın." }, { status: 400 });
        }
        return assistantSseResponse({
          messages: body.messages,
          nowIso: body.nowIso,
          timeZone: body.timeZone,
          userId: user.id,
        });
      },
    },
  },
});
