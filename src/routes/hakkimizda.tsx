import { createFileRoute } from "@tanstack/react-router";
import { LegalDoc } from "@/components/legal-doc";

export const Route = createFileRoute("/hakkimizda")({
  component: () => <LegalDoc slug="hakkimizda" />,
});
