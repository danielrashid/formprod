import { redirect } from "next/navigation";
import { requireProfile, isMaster } from "@/app/actions/auth";
import { FormularioDinamico } from "@/app/entrevistas/[id]/formulario";
import type { EntrevistaComForm, Pessoa, Question } from "@/lib/types";
import type { UserRole } from "@/components/ui";

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
      "id, status, observacoes, latitude, longitude, agente_id, pessoa_id, forms(id, nome)"
    )
    .eq("id", id)
    .single();

  if (!entrevista) {
    redirect("/entrevistas");
  }

  const entrevistaData = entrevista as unknown as EntrevistaComForm;

  if (!entrevistaData.forms) {
    redirect("/entrevistas");
  }

  let pessoa: Pessoa | null = null;
  if (entrevistaData.pessoa_id) {
    const { data: pessoaData } = await supabase
      .from("pessoas")
      .select("*")
      .eq("id", entrevistaData.pessoa_id)
      .single();
    pessoa = (pessoaData as Pessoa | null) ?? null;
  }

  const ehDono = entrevistaData.agente_id === profile.id;
  const role = profile.role as UserRole;
  const concluida = entrevistaData.status === "concluida";
  const visualizando = !ehDono && role !== "agente" && concluida;

  if (!ehDono && (!concluida || role === "agente")) {
    redirect("/painel");
  }

  if (!ehDono && role !== "agente") {
    const master = await isMaster();
    if (!master) {
      const { data: form } = await supabase
        .from("forms")
        .select("secretaria_id")
        .eq("id", entrevistaData.forms.id)
        .single();
      if (form?.secretaria_id !== profile.secretaria_id) {
        redirect("/painel");
      }
    }
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
      voltarPara={visualizando ? "/painel" : "/entrevistas"}
      pessoa={pessoa}
    />
  );
}
