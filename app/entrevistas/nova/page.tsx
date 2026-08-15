import { redirect } from "next/navigation";
import { requireProfile } from "@/app/actions/auth";

export default async function NovaEntrevistaPage({
  searchParams,
}: {
  searchParams: Promise<{ form?: string }>;
}) {
  const { supabase, profile } = await requireProfile();
  const { form: formId } = await searchParams;

  if (!formId) {
    redirect("/entrevistas");
  }

  const { data: form } = await supabase
    .from("forms")
    .select("id, nome")
    .eq("id", formId)
    .eq("ativo", true)
    .single();

  if (!form) {
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
