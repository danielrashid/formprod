import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MapaClient } from "@/app/mapa/mapa-client";
import type { Pessoa } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function MapaPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: pessoas } = await supabase
    .from("pessoas")
    .select("*")
    .order("nome");

  const { data: contagem } = await supabase.rpc("contagem_entrevistas_cidadaos");
  const entrevistasPorPessoa: Record<string, number> =
    (contagem as Record<string, number> | null) ?? {};

  return (
    <MapaClient
      pessoas={(pessoas ?? []) as Pessoa[]}
      entrevistasPorPessoa={entrevistasPorPessoa}
    />
  );
}
