import { redirect } from "next/navigation";
import { requireProfile, isMaster } from "@/app/actions/auth";

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

  const { data, error } = await supabase
    .from("entrevistas")
    .insert({ form_id: form.id, agente_id: profile.id })
    .select("id")
    .single();

  if (error || !data) {
    redirect("/entrevistas");
  }

  redirect(`/entrevistas/${data.id}`);
}
