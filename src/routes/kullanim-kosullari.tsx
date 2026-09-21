import { createFileRoute } from "@tanstack/react-router";
import { LegalDoc } from "@/components/legal-doc";

export const Route = createFileRoute("/kullanim-kosullari")({
  component: () => <LegalDoc slug="kullanim-kosullari" />,
});
