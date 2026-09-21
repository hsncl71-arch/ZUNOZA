import type { ErrorComponentProps } from "@tanstack/react-router";
import { TriangleAlert } from "lucide-react";

const FALLBACK_MESSAGE = "Beklenmeyen bir hata oluştu. Sayfayı yenilemeyi deneyin.";

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error) return error;
  return FALLBACK_MESSAGE;
}

export function AppErrorComponent({ error }: ErrorComponentProps) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-bg px-6 text-center text-fg">
      <span className="text-danger" aria-hidden="true">
        <TriangleAlert className="size-10" strokeWidth={2} />
      </span>
      <h1 className="text-lg font-semibold">Bir şeyler ters gitti</h1>
      <p className="max-w-md text-sm break-words text-muted">{errorMessage(error)}</p>
      <a href="/" className="mt-2 min-h-11 rounded-full bg-accent px-5 text-sm leading-[2.75rem] text-accent-fg">
        Ana sayfaya dön
      </a>
      <button
        type="button"
        className="min-h-11 rounded-full bg-elevated px-5 text-sm text-fg"
        onClick={() => window.location.reload()}
      >
        Tekrar Dene
      </button>
    </main>
  );
}
