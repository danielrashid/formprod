import { redirect } from "next/navigation";
import { requireProfile } from "@/app/actions/auth";
import { FormularioDinamico } from "@/app/entrevistas/[id]/formulario";
import type { EntrevistaComForm, Question } from "@/lib/types";

export default async function EntrevistaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { supabase, profile } = await requireProfile();
  const { id } = await params;

  const { data: entrevista } = await supabase
    .from("entrevistas")
    .select(
      "id, status, observacoes, latitude, longitude, agente_id, forms(id, nome)"
    )
    .eq("id", id)
    .single();

  if (!entrevista) {
    redirect("/entrevistas");
  }

  if (entrevista.agente_id !== profile.id) {
    redirect("/entrevistas");
  }

  const entrevistaData = entrevista as unknown as EntrevistaComForm;

  if (!entrevistaData.forms) {
    redirect("/entrevistas");
  }

  const { data: questions } = await supabase
    .from("questions")
    .select("id, form_id, titulo, tipo, opcoes, obrigatoria, ordem")
    .eq("form_id", entrevistaData.forms.id)
    .eq("ativo", true)
    .order("ordem");

  const questionsData = (questions ?? []) as unknown as Question[];

  const { data: answers } = await supabase
    .from("answers")
    .select("question_id, valor")
    .eq("entrevista_id", entrevista.id);

  const answersMap = new Map<string, unknown>(
    (answers ?? []).map((a) => [a.question_id, a.valor])
  );

  return (
    <FormularioDinamico
      entrevistaId={entrevistaData.id}
      formNome={entrevistaData.forms.nome}
      status={entrevistaData.status}
      observacoes={entrevistaData.observacoes}
      latitude={entrevistaData.latitude}
      longitude={entrevistaData.longitude}
      questions={questionsData}
      initialAnswers={answersMap}
    />
  );
}
