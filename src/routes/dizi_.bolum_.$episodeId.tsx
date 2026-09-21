import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/dizi_/bolum_/$episodeId")({ component: Page });

function Page() {
  return <Navigate to="/" replace />;
}
