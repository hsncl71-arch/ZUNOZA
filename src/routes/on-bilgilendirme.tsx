import { createFileRoute } from "@tanstack/react-router";
import { LegalDoc } from "@/components/legal-doc";

export const Route = createFileRoute("/on-bilgilendirme")({
  component: () => <LegalDoc slug="on-bilgilendirme" />,
});
