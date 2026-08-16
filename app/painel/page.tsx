import { requireProfile, isMaster } from "@/app/actions/auth";
import { AppShell, NavItem, Card, Badge, SectionTitle, EmptyState } from "@/components/ui";
import type { EntrevistaComFormEAgente } from "@/lib/types";
import {
  ClipboardList,
  Home,
  LayoutDashboard,
  Building2,
  MapPin,
  CheckCircle2,
  Clock,
  Users,
  Map,
} from "lucide-react";
import type { UserRole } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function PainelPage() {
  const { supabase, profile } = await requireProfile();
  const role = profile.role as UserRole;
  const master = await isMaster();

  const query = supabase
    .from("entrevistas")
    .select(
      "id, status, created_at, latitude, longitude, agente_id, profiles(full_name), forms(id, nome, secretaria_id)"
    )
    .order("created_at", { ascending: false })
    .limit(100);

  const { data: entrevistas } = master
    ? await query
    : await query.filter("forms.secretaria_id", "eq", profile.secretaria_id!);

  const entrevistasData = (entrevistas ?? []) as unknown as EntrevistaComFormEAgente[];

  const concluidas = entrevistasData.filter((e) => e.status === "concluida").length;
  const comGps = entrevistasData.filter(
    (e) => e.latitude != null && e.longitude != null
  ).length;

  const nav = [
    NavItem("/", "Início", Home, false),
    NavItem("/entrevistas", "Entrevistas", ClipboardList, false),
    NavItem("/mapa", "Mapa", Map, false),
    NavItem("/painel", "Painel", LayoutDashboard, true),
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
      <section className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl bg-surface p-4 text-center shadow-card">
          <p className="text-2xl font-bold text-primary">{entrevistasData.length}</p>
          <p className="text-xs font-medium text-muted">Total</p>
        </div>
        <div className="rounded-2xl bg-surface p-4 text-center shadow-card">
          <p className="text-2xl font-bold text-success">{concluidas}</p>
          <p className="text-xs font-medium text-muted">Concluídas</p>
        </div>
        <div className="rounded-2xl bg-surface p-4 text-center shadow-card">
          <p className="text-2xl font-bold text-accent">{comGps}</p>
          <p className="text-xs font-medium text-muted">Com GPS</p>
        </div>
      </section>

      <div className="mt-8">
        <SectionTitle
          action={
            <span className="flex items-center gap-1.5 text-xs font-medium text-muted">
              <Users className="size-3.5" />
              {new Set(entrevistasData.map((e) => e.agente_id)).size} agentes
            </span>
          }
        >
          Registros recentes
        </SectionTitle>
        <div className="space-y-3">
          {entrevistasData.map((e) => {
            const concluida = e.status === "concluida";
            return (
              <Card key={e.id} className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
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
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 font-medium text-foreground">
                        <Building2 className="size-3.5 text-muted" />
                        <span className="truncate">{e.forms?.nome}</span>
                      </p>
                      <p className="mt-0.5 text-xs text-muted">
                        {e.profiles?.full_name} ·{" "}
                        {new Date(e.created_at).toLocaleString("pt-BR", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                  <Badge tone={concluida ? "green" : "amber"}>
                    {concluida ? "Concluída" : "Andamento"}
                  </Badge>
                </div>
                {e.latitude != null && e.longitude != null && (
                  <p className="mt-3 flex items-center gap-1.5 rounded-lg bg-slate-50 px-3 py-1.5 text-xs text-muted">
                    <MapPin className="size-3.5 text-accent" />
                    {e.latitude.toFixed(5)}, {e.longitude.toFixed(5)}
                  </p>
                )}
              </Card>
            );
          })}
          {entrevistasData.length === 0 && (
            <EmptyState
              icon={<LayoutDashboard className="size-8" />}
              title="Nenhuma entrevista registrada"
              description="Quando os agentes iniciarem os levantamentos, eles aparecem aqui."
            />
          )}
        </div>
      </div>
    </AppShell>
  );
}
