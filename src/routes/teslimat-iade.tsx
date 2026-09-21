import { createFileRoute } from "@tanstack/react-router";
import { LegalDoc } from "@/components/legal-doc";

export const Route = createFileRoute("/teslimat-iade")({
  component: () => <LegalDoc slug="teslimat-iade" />,
});
