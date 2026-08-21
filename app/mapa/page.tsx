import { requireProfile, isMaster } from "@/app/actions/auth";
import { MapaClient } from "@/app/mapa/mapa-client";
import type { Pessoa } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function MapaPage() {
  const { supabase, profile } = await requireProfile();
  const master = await isMaster();

  const { data: pessoas } = await supabase
    .from("pessoas")
    .select("*")
    .order("nome");

  const { data: contagem } = await supabase.rpc("contagem_entrevistas_cidadaos");
  const entrevistasPorPessoa: Record<string, number> =
    (contagem as Record<string, number> | null) ?? {};

  let formsQuery = supabase.from("forms").select("id, nome").eq("ativo", true);

  if (!master) {
    formsQuery = formsQuery.eq("secretaria_id", profile.secretaria_id ?? "__none__");
  }

  const { data: forms } = await formsQuery.order("nome");

  return (
    <MapaClient
      pessoas={(pessoas ?? []) as Pessoa[]}
      entrevistasPorPessoa={entrevistasPorPessoa}
      forms={forms ?? []}
      agenteId={profile.id}
    />
  );
}
