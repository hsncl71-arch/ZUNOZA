import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/dizi")({ component: Page });

function Page() {
  return <Navigate to="/" replace />;
}
