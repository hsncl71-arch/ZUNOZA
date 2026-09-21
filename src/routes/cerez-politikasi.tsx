import { createFileRoute } from "@tanstack/react-router";
import { LegalDoc } from "@/components/legal-doc";

export const Route = createFileRoute("/cerez-politikasi")({
  component: () => <LegalDoc slug="cerez-politikasi" />,
});
