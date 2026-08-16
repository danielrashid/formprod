import { redirect } from "next/navigation";
import { requireProfile } from "@/app/actions/auth";
import { GerenciarPerguntas } from "@/app/gerenciar-perguntas/editor";
import type { Question } from "@/lib/types";

export default async function GerenciarPerguntasPage({
  searchParams,
}: {
  searchParams: Promise<{ form?: string }>;
}) {
  const { supabase, profile } = await requireProfile();

  if (profile.role !== "editor" && profile.role !== "admin") {
    redirect("/");
  }

  const { form: formIdParam } = await searchParams;

  const { data: forms } = await supabase
    .from("forms")
    .select("id, nome, secretaria_id")
    .eq("ativo", true)
    .order("nome");

  const formsData = (forms ?? []) as unknown as {
    id: string;
    nome: string;
    secretaria_id: string | null;
  }[];

  const formsVisiveis =
    profile.role === "admin"
      ? formsData
      : formsData.filter((f) => f.secretaria_id === profile.secretaria_id);

  const form =
    (formIdParam ? formsVisiveis.find((f) => f.id === formIdParam) : null) ??
    formsVisiveis[0] ??
    null;

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
      forms={formsVisiveis.map((f) => ({ id: f.id, nome: f.nome }))}
      questions={questionsData}
    />
  );
}
