import { createFileRoute } from "@tanstack/react-router";
import { LegalDoc } from "@/components/legal-doc";

export const Route = createFileRoute("/kvkk-aydinlatma")({
  component: () => <LegalDoc slug="kvkk-aydinlatma" />,
});
