"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Trash2 } from "lucide-react";

export function ExcluirEntrevista({ id }: { id: string }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function excluir() {
    if (deleting) return;
    const ok = window.confirm(
      "Excluir esta entrevista em andamento?\n\nNada será registrado. Essa ação não pode ser desfeita."
    );
    if (!ok) return;

    setDeleting(true);
    const supabase = createClient();
    const { error } = await supabase.from("entrevistas").delete().eq("id", id);

    if (error) {
      setDeleting(false);
      window.alert("Não foi possível excluir: " + error.message);
      return;
    }

    router.refresh();
  }

  return (
    <button
      onClick={excluir}
      disabled={deleting}
      className="grid size-10 shrink-0 place-items-center rounded-full bg-danger-soft text-danger transition hover:bg-danger hover:text-white disabled:opacity-50"
      title="Excluir entrevista"
    >
      {deleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
    </button>
  );
}
