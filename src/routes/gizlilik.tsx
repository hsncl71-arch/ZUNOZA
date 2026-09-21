import { createFileRoute } from "@tanstack/react-router";
import { LegalDoc } from "@/components/legal-doc";

export const Route = createFileRoute("/gizlilik")({
  component: () => <LegalDoc slug="gizlilik" />,
});
