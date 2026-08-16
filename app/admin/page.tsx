import { redirect } from "next/navigation";
import { requireProfile } from "@/app/actions/auth";
import { AppShell, NavItem } from "@/components/ui";
import { AdminClient, type SecretariaAdmin, type UsuarioAdmin, type FormAdmin } from "@/app/admin/admin-client";
import {
  Home,
  ClipboardList,
  LayoutDashboard,
  Settings2,
  Map,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const { supabase, profile } = await requireProfile();

  if (profile.role !== "admin") {
    redirect("/");
  }

  const { data: secretarias } = await supabase
    .from("secretarias")
    .select("id, nome, sigla")
    .order("nome");

  const { data: usuarios } = await supabase
    .from("profiles")
    .select("id, full_name, role, secretaria_id, cpf, telefone, secretarias(nome, sigla)")
    .order("full_name");

  type UsuarioRow = {
    id: string;
    full_name: string;
    role: string;
    secretaria_id: string | null;
    cpf: string | null;
    telefone: string | null;
    secretarias: { nome: string; sigla: string } | null;
  };
  const usuariosData = (usuarios ?? []) as unknown as UsuarioRow[];

  const { data: forms } = await supabase
    .from("forms")
    .select("id, nome, descricao, secretaria_id")
    .order("nome");

  const emails: Record<string, string> = {};
  for (const u of usuariosData) {
    const { data } = await supabase.rpc("user_email", { user_id: u.id });
    if (typeof data === "string") emails[u.id] = data;
  }

  const nav = [
    NavItem("/", "Início", Home, false),
    NavItem("/entrevistas", "Entrevistas", ClipboardList, false),
    NavItem("/mapa", "Mapa", Map, false),
    NavItem("/painel", "Painel", LayoutDashboard, false),
    NavItem("/admin", "Admin", Settings2, true),
  ];

  return (
    <AppShell
      title="Administração"
      subtitle="Secretarias, formulários e usuários"
      user={{ full_name: profile.full_name, role: "admin", secretaria: undefined }}
      nav={nav}
    >
      <AdminClient
        secretarias={(secretarias ?? []) as unknown as SecretariaAdmin[]}
        usuarios={usuariosData as unknown as UsuarioAdmin[]}
        emails={emails}
        forms={(forms ?? []) as unknown as FormAdmin[]}
      />
    </AppShell>
  );
}
