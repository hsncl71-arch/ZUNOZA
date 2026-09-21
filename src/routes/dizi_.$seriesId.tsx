import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/dizi_/$seriesId")({ component: Page });

function Page() {
  return <Navigate to="/" replace />;
}
