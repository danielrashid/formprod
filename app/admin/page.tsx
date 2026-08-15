import { redirect } from "next/navigation";
import { requireProfile } from "@/app/actions/auth";
import { AppShell, NavItem, Card, Badge, SectionTitle, EmptyState } from "@/components/ui";
import { criarSecretaria, criarFormulario, criarUsuario } from "@/app/actions/admin";
import {
  Home,
  ClipboardList,
  LayoutDashboard,
  Settings2,
  Building2,
  UserPlus,
  FilePlus2,
  Users,
  ShieldCheck,
  Mail,
  Map,
} from "lucide-react";

export const dynamic = "force-dynamic";

const ROLE_LABEL: Record<string, string> = {
  admin: "Admin",
  editor: "Editor",
  agente: "Agente",
};

const inputClass =
  "w-full rounded-xl border border-border bg-slate-50 px-3 py-2.5 text-sm text-foreground placeholder:text-slate-400 focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20";

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
    .select("id, full_name, role, secretaria_id, secretarias(nome, sigla)")
    .order("full_name");

  type UsuarioAdmin = {
    id: string;
    full_name: string;
    role: string;
    secretaria_id: string | null;
    secretarias: { nome: string; sigla: string } | null;
  };
  const usuariosData = (usuarios ?? []) as unknown as UsuarioAdmin[];

  const { data: forms } = await supabase
    .from("forms")
    .select("id, nome, secretaria_id")
    .order("nome");

  const emails = new globalThis.Map<string, string>();
  for (const u of usuariosData) {
    const { data } = await supabase.rpc("user_email", { user_id: u.id });
    if (typeof data === "string") emails.set(u.id, data);
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
      {/* Secretarias */}
      <SectionTitle
        action={
          <span className="text-xs font-medium text-muted">
            {secretarias?.length ?? 0} secretarias
          </span>
        }
      >
        Secretarias
      </SectionTitle>
      <div className="grid gap-2">
        {secretarias?.map((s) => (
          <Card key={s.id} className="flex items-center gap-3 p-3">
            <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">
              <Building2 className="size-4.5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-foreground">{s.sigla}</p>
              <p className="truncate text-xs text-muted">{s.nome}</p>
            </div>
            <Badge tone="blue">
              {forms?.filter((f) => f.secretaria_id === s.id).length ?? 0} form(s)
            </Badge>
          </Card>
        ))}
      </div>

      <div className="mt-6 rounded-2xl bg-surface shadow-card">
        <div className="border-b border-border px-5 py-3.5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Building2 className="size-4 text-primary" />
            Nova secretaria
          </h2>
        </div>
        <form action={criarSecretaria} className="space-y-3 px-5 py-4">
          <input
            name="nome"
            required
            placeholder="Nome (ex: Secretaria de Desenvolvimento Social)"
            className={inputClass}
          />
          <input
            name="sigla"
            required
            placeholder="Sigla (ex: SEDES)"
            className={inputClass}
          />
          <button
            type="submit"
            className="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-white transition hover:bg-primary-hover"
          >
            Adicionar secretaria
          </button>
        </form>
      </div>

      {/* Formulários */}
      <div className="mt-6 rounded-2xl bg-surface shadow-card">
        <div className="border-b border-border px-5 py-3.5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <FilePlus2 className="size-4 text-primary" />
            Novo formulário
          </h2>
        </div>
        <form action={criarFormulario} className="space-y-3 px-5 py-4">
          <select
            name="secretaria_id"
            required
            className={inputClass}
            defaultValue=""
          >
            <option value="" disabled>
              Selecione a secretaria...
            </option>
            {secretarias?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.sigla} — {s.nome}
              </option>
            ))}
          </select>
          <input
            name="nome"
            required
            placeholder="Nome do formulário (ex: Retorno ao lar — SEDES)"
            className={inputClass}
          />
          <input
            name="descricao"
            placeholder="Descrição (opcional)"
            className={inputClass}
          />
          <button
            type="submit"
            className="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-white transition hover:bg-primary-hover"
          >
            Criar formulário
          </button>
        </form>
      </div>

      {/* Usuários */}
      <div className="mt-6 rounded-2xl bg-surface shadow-card">
        <div className="border-b border-border px-5 py-3.5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <UserPlus className="size-4 text-primary" />
            Novo usuário
          </h2>
        </div>
        <form action={criarUsuario} className="space-y-3 px-5 py-4">
          <input
            name="nome"
            required
            placeholder="Nome completo"
            className={inputClass}
          />
          <input
            name="email"
            type="email"
            required
            placeholder="Email"
            className={inputClass}
          />
          <input
            name="senha"
            type="password"
            required
            minLength={6}
            placeholder="Senha (mín. 6 caracteres)"
            className={inputClass}
          />
          <select name="role" required className={inputClass} defaultValue="agente">
            <option value="agente">Agente (preenche formulários)</option>
            <option value="editor">Editor (cria perguntas)</option>
            <option value="admin">Admin</option>
          </select>
          <select name="secretaria_id" className={inputClass} defaultValue="">
            <option value="">Secretaria (opcional)</option>
            {secretarias?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.sigla} — {s.nome}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-white transition hover:bg-primary-hover"
          >
            Criar usuário
          </button>
        </form>
      </div>

      {/* Lista de usuários */}
      <div className="mt-8">
        <SectionTitle
          action={
            <span className="text-xs font-medium text-muted">
              {usuariosData.length} usuários
            </span>
          }
        >
          Usuários
        </SectionTitle>
        <div className="space-y-2">
          {usuariosData.map((u) => (
            <Card key={u.id} className="flex items-center gap-3 p-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-full bg-slate-100 text-sm font-bold text-slate-600">
                {u.full_name.slice(0, 1)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-foreground">{u.full_name}</p>
                <p className="flex items-center gap-1 truncate text-xs text-muted">
                  <Mail className="size-3 shrink-0" />
                  {emails.get(u.id) ?? ""}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <Badge tone={u.role === "admin" ? "blue" : u.role === "editor" ? "amber" : "slate"}>
                  <ShieldCheck className="size-3" />
                  {ROLE_LABEL[u.role] ?? u.role}
                </Badge>
                <span className="text-[11px] font-medium text-muted">
                  {u.secretarias?.sigla ?? "Sem secretaria"}
                </span>
              </div>
            </Card>
          ))}
          {usuariosData.length === 0 && (
            <EmptyState
              icon={<Users className="size-8" />}
              title="Nenhum usuário"
              description="Crie o primeiro usuário no formulário acima."
            />
          )}
        </div>
      </div>
    </AppShell>
  );
}
