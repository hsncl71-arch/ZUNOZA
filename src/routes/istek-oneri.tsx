import { createFileRoute } from "@tanstack/react-router";
import { AppGate } from "@/components/gate";
import { NoteForm } from "@/components/note-form";

export const Route = createFileRoute("/istek-oneri")({ component: Page });

function Page() {
  return (
    <AppGate>
      <NoteForm
        title="İstek Öneri"
        hint="Eklemek istediğiniz özelliği yazın. Kayıt yönetici paneline iletilir."
        storageKey="zunoza.ideaNotes"
        kind="istek"
      />
    </AppGate>
  );
}
