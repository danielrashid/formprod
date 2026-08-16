import { requireProfile, isMaster } from "@/app/actions/auth";
import { AppShell, NavItem, Card, Badge, SectionTitle, EmptyState } from "@/components/ui";
import type {
  EntrevistaComForm,
  FormComSecretaria,
} from "@/lib/types";
import {
  ClipboardList,
  Home,
  LayoutDashboard,
  PlusCircle,
  Building2,
  Clock,
  CheckCircle2,
  Map,
} from "lucide-react";
import type { UserRole } from "@/components/ui";
import { ExcluirEntrevista } from "@/app/entrevistas/excluir";

export const dynamic = "force-dynamic";

export default async function EntrevistasPage() {
  const { supabase, profile } = await requireProfile();
  const master = await isMaster();
  const role = profile.role as UserRole;

  let formsQuery = supabase
    .from("forms")
    .select("id, nome, descricao, secretaria_id, secretarias(nome, sigla)")
    .eq("ativo", true);

  if (!master) {
    formsQuery = formsQuery.eq("secretaria_id", profile.secretaria_id ?? "__none__");
  }

  const { data: forms } = await formsQuery.order("nome");

  const formsData = (forms ?? []) as unknown as FormComSecretaria[];

  const { data: entrevistas } = await supabase
    .from("entrevistas")
    .select("id, status, created_at, updated_at, forms(nome)")
    .eq("agente_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const entrevistasData = (entrevistas ?? []) as unknown as EntrevistaComForm[];

  const concluidas = entrevistasData.filter((e) => e.status === "concluida").length;

  const nav = [
    NavItem("/", "Início", Home, false),
    NavItem("/entrevistas", "Entrevistas", ClipboardList, true),
    NavItem("/mapa", "Mapa", Map, false),
    ...(role !== "agente"
      ? [NavItem("/painel", "Painel", LayoutDashboard, false)]
      : []),
  ];

  return (
    <AppShell
      title="Entrevistas"
      subtitle={`${entrevistasData.length} registros · ${concluidas} concluídas`}
      user={{ full_name: profile.full_name, role, secretaria: undefined }}
      nav={nav}
    >
      <SectionTitle>Nova entrevista</SectionTitle>
      <div className="grid gap-3">
        {formsData.map((form) => (
          <a key={form.id} href={`/entrevistas/nova?form=${form.id}`} className="group">
            <Card className="flex items-center gap-4 p-4 transition group-hover:shadow-card-hover">
              <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
                <Building2 className="size-6" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-foreground">{form.nome}</p>
                <p className="truncate text-sm text-muted">
                  {form.secretarias?.nome} ({form.secretarias?.sigla})
                </p>
              </div>
              <div className="grid size-9 place-items-center rounded-full bg-primary text-white shadow-md transition group-hover:scale-105">
                <PlusCircle className="size-5" />
              </div>
            </Card>
          </a>
        ))}
        {formsData.length === 0 && (
          <EmptyState
            icon={<Building2 className="size-8" />}
            title="Nenhum formulário ativo"
            description="Fale com o administrador para habilitar um formulário."
          />
        )}
      </div>

      <div className="mt-8">
        <SectionTitle
          action={
            <span className="text-xs font-medium text-muted">
              {concluidas} de {entrevistasData.length} concluídas
            </span>
          }
        >
          Minhas entrevistas
        </SectionTitle>
        <div className="grid gap-3">
          {entrevistasData.map((e) => {
            const concluida = e.status === "concluida";
            return (
              <div key={e.id} className="flex items-center gap-2">
                <a href={`/entrevistas/${e.id}`} className="group min-w-0 flex-1">
                  <Card className="flex items-center gap-3 p-4 transition group-hover:shadow-card-hover">
                    <div
                      className={`grid size-10 shrink-0 place-items-center rounded-full ${
                        concluida
                          ? "bg-success-soft text-success"
                          : "bg-warning-soft text-warning"
                      }`}
                    >
                      {concluida ? (
                        <CheckCircle2 className="size-5" />
                      ) : (
                        <Clock className="size-5" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-foreground">
                        {e.forms?.nome}
                      </p>
                      <p className="text-xs text-muted">
                        {new Date(e.created_at).toLocaleString("pt-BR", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <Badge tone={concluida ? "green" : "amber"}>
                      {concluida ? "Concluída" : "Em andamento"}
                    </Badge>
                  </Card>
                </a>
                {!concluida && <ExcluirEntrevista id={e.id} />}
              </div>
            );
          })}
          {entrevistasData.length === 0 && (
            <EmptyState
              icon={<ClipboardList className="size-8" />}
              title="Nenhuma entrevista ainda"
              description="Selecione um formulário acima para iniciar o primeiro levantamento."
            />
          )}
        </div>
      </div>
    </AppShell>
  );
}
