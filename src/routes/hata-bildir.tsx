import { createFileRoute } from "@tanstack/react-router";
import { AppGate } from "@/components/gate";
import { NoteForm } from "@/components/note-form";

export const Route = createFileRoute("/hata-bildir")({ component: Page });

function Page() {
  return (
    <AppGate>
      <NoteForm
        title="Hata Bildir"
        hint="Gördüğünüz sorunu yazın. Kayıt yönetici paneline iletilir."
        storageKey="zunoza.bugNotes"
        kind="hata"
      />
    </AppGate>
  );
}
