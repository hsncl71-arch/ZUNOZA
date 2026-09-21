import { createFileRoute } from "@tanstack/react-router";
import { musicConnectionStatus } from "@/lib/zunoza/music";

export const Route = createFileRoute("/api/muzik-durum")({
  server: {
    handlers: {
      GET: async () => {
        const status = await musicConnectionStatus(true);
        return Response.json({
          ready: status.ready,
          lyricsReady: status.lyricsReady,
          r2Ready: status.r2Ready,
          r2Write: status.r2Write,
          r2WriteStatus: status.r2WriteStatus,
          r2WriteCode: status.r2WriteCode,
          r2Region: status.r2Region,
          r2HostKind: status.r2HostKind,
          eleven: status.eleven,
        });
      },
    },
  },
});
