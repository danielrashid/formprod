import { redirect } from "next/navigation";
import { requireProfile } from "@/app/actions/auth";
import { GerenciarPerguntas } from "@/app/gerenciar-perguntas/editor";
import type { Question } from "@/lib/types";

export default async function GerenciarPerguntasPage() {
  const { supabase, profile } = await requireProfile();

  if (profile.role !== "editor" && profile.role !== "admin") {
    redirect("/");
  }

  const { data: forms } = await supabase
    .from("forms")
    .select("id, nome, secretaria_id")
    .eq("ativo", true)
    .order("nome");

  const form =
    profile.role === "admin"
      ? forms?.[0] ?? null
      : (forms?.find((f) => f.secretaria_id === profile.secretaria_id) ?? null);

  if (!form) {
    redirect("/");
  }

  const { data: questions } = await supabase
    .from("questions")
    .select("id, titulo, tipo, opcoes, obrigatoria, ordem, ativo")
    .eq("form_id", form.id)
    .order("ordem");

  const questionsData = (questions ?? []) as unknown as Question[];

  return (
    <GerenciarPerguntas
      formId={form.id}
      formNome={form.nome}
      questions={questionsData}
    />
  );
}
