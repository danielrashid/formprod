import { requireProfile, isMaster } from "@/app/actions/auth";
import { AppShell, NavItem } from "@/components/ui";
import {
  ClipboardList,
  Home,
  LayoutDashboard,
  Map,
  Settings2,
} from "lucide-react";
import type { UserRole } from "@/components/ui";
import { PainelClient, type PainelEntrevista } from "@/app/painel/painel-client";

export const dynamic = "force-dynamic";

export default async function PainelPage() {
  const { supabase, profile } = await requireProfile();
  const role = profile.role as UserRole;
  const master = await isMaster();

  const query = supabase
    .from("entrevistas")
    .select(
      "id, status, created_at, latitude, longitude, agente_id, profiles(full_name), forms(id, nome, secretaria_id, secretarias(nome, sigla))"
    )
    .order("created_at", { ascending: false })
    .limit(100);

  const { data: entrevistas } = master
    ? await query
    : await query.filter("forms.secretaria_id", "eq", profile.secretaria_id!);

  const entrevistasData = (entrevistas ?? []) as unknown as PainelEntrevista[];

  const nav = [
    NavItem("/", "Início", Home, false),
    NavItem("/entrevistas", "Entrevistas", ClipboardList, false),
    NavItem("/mapa", "Mapa", Map, false),
    NavItem("/painel", "Painel", LayoutDashboard, true),
    ...(role === "admin"
      ? [NavItem("/admin", "Admin", Settings2, false)]
      : []),
  ];

  return (
    <AppShell
      title="Painel"
      subtitle={
        master
          ? "Entrevistas de todas as secretarias"
          : "Entrevistas da sua secretaria"
      }
      user={{ full_name: profile.full_name, role, secretaria: undefined }}
      nav={nav}
    >
      <PainelClient entrevistas={entrevistasData} />
    </AppShell>
  );
}
