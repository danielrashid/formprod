import { redirect } from "next/navigation";
import { requireProfile, isMaster } from "@/app/actions/auth";
import { NovaEntrevistaClient } from "@/app/entrevistas/nova/nova-client";
import type { Pessoa } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function NovaEntrevistaPage({
  searchParams,
}: {
  searchParams: Promise<{ form?: string }>;
}) {
  const { supabase, profile } = await requireProfile();
  const master = await isMaster();
  const { form: formId } = await searchParams;

  if (!formId) {
    redirect("/entrevistas");
  }

  const { data: form } = await supabase
    .from("forms")
    .select("id, nome, secretaria_id")
    .eq("id", formId)
    .eq("ativo", true)
    .single();

  if (!form) {
    redirect("/entrevistas");
  }

  if (!master && form.secretaria_id !== profile.secretaria_id) {
    redirect("/entrevistas");
  }

  const { data: pessoas } = await supabase
    .from("pessoas")
    .select("*")
    .order("nome");

  return (
    <NovaEntrevistaClient
      formId={form.id}
      formNome={form.nome}
      agenteId={profile.id}
      pessoas={(pessoas ?? []) as Pessoa[]}
    />
  );
}
