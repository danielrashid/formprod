"use client";

import { useMemo, useState } from "react";
import { Card, Badge, SectionTitle, EmptyState } from "@/components/ui";
import {
  Building2,
  MapPin,
  CheckCircle2,
  Clock,
  Users,
  LayoutDashboard,
  Search,
  Calendar,
  Filter,
  X,
} from "lucide-react";
import { formatDateTimeBR, formatDateBR } from "@/lib/dates";

export interface PainelEntrevista {
  id: string;
  status: "em_andamento" | "concluida";
  created_at: string;
  latitude: number | null;
  longitude: number | null;
  agente_id: string;
  profiles: { full_name: string } | null;
  forms: {
    id: string;
    nome: string;
    secretaria_id: string | null;
    secretarias: { nome: string; sigla: string } | null;
  } | null;
}

type FiltroStatus = "todas" | "concluida" | "em_andamento";

export function PainelClient({
  entrevistas,
}: {
  entrevistas: PainelEntrevista[];
}) {
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>("todas");
  const [buscaNome, setBuscaNome] = useState("");
  const [buscaSecretaria, setBuscaSecretaria] = useState("");
  const [buscaData, setBuscaData] = useState("");

  const secretarias = useMemo(() => {
    const set = new Set<string>();
    entrevistas.forEach((e) => {
      const nome = e.forms?.secretarias?.nome;
      if (nome) set.add(nome);
    });
    return [...set].sort();
  }, [entrevistas]);

  const total = entrevistas.length;
  const concluidas = entrevistas.filter((e) => e.status === "concluida").length;
  const emAndamento = entrevistas.filter((e) => e.status === "em_andamento").length;

  const agentes = useMemo(
    () => new Set(entrevistas.map((e) => e.agente_id)).size,
    [entrevistas]
  );

  const filtradas = useMemo(() => {
    const nome = buscaNome.trim().toLowerCase();
    return entrevistas.filter((e) => {
      if (filtroStatus !== "todas" && e.status !== filtroStatus) return false;
      if (nome && !e.profiles?.full_name.toLowerCase().includes(nome)) return false;
      if (buscaSecretaria && e.forms?.secretarias?.nome !== buscaSecretaria)
        return false;
      if (buscaData && formatDateBR(e.created_at) !== buscaData) return false;
      return true;
    });
  }, [entrevistas, filtroStatus, buscaNome, buscaSecretaria, buscaData]);

  const temFiltro =
    filtroStatus !== "todas" || buscaNome || buscaSecretaria || buscaData;

  function limparFiltros() {
    setFiltroStatus("todas");
    setBuscaNome("");
    setBuscaSecretaria("");
    setBuscaData("");
  }

  const inputClass =
    "w-full rounded-xl border border-border bg-slate-50 px-3 py-2.5 text-sm text-foreground placeholder:text-slate-400 focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20";

  const statCard = (
    ativo: boolean,
    valor: number,
    label: string,
    onClick: () => void
  ) => (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-0.5 rounded-2xl p-3 text-center shadow-card transition active:scale-[0.97] ${
        ativo ? "bg-primary text-white" : "bg-surface text-foreground"
      }`}
    >
      <span className="text-2xl font-bold leading-none">{valor}</span>
      <span
        className={`text-[11px] font-semibold leading-tight ${
          ativo ? "text-white/80" : "text-muted"
        }`}
      >
        {label}
      </span>
    </button>
  );

  return (
    <>
      <section className="grid grid-cols-3 gap-2">
        {statCard(
          filtroStatus === "todas",
          total,
          "Total",
          () => setFiltroStatus("todas")
        )}
        {statCard(
          filtroStatus === "concluida",
          concluidas,
          "Concluídas",
          () => setFiltroStatus("concluida")
        )}
        {statCard(
          filtroStatus === "em_andamento",
          emAndamento,
          "Em andamento",
          () => setFiltroStatus("em_andamento")
        )}
      </section>

      <section className="mt-5 rounded-2xl bg-surface shadow-card">
        <div className="border-b border-border px-5 py-3.5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Filter className="size-4 text-primary" />
            Filtros
          </h2>
        </div>
        <div className="space-y-3 px-5 py-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={buscaNome}
              onChange={(e) => setBuscaNome(e.target.value)}
              placeholder="Buscar por nome do agente"
              className={`${inputClass} pl-9`}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="relative">
              <Calendar className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                type="date"
                value={buscaData}
                onChange={(e) => setBuscaData(e.target.value)}
                className={`${inputClass} pl-9`}
              />
            </div>
            <select
              value={buscaSecretaria}
              onChange={(e) => setBuscaSecretaria(e.target.value)}
              className={inputClass}
            >
              <option value="">Todas as secretarias</option>
              {secretarias.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <div className="mt-8">
        <SectionTitle
          action={
            temFiltro ? (
              <button
                onClick={limparFiltros}
                className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                <X className="size-3.5" /> Limpar filtros
              </button>
            ) : (
              <span className="flex items-center gap-1.5 text-xs font-medium text-muted">
                <Users className="size-3.5" />
                {agentes} agentes
              </span>
            )
          }
        >
          Registros recentes
        </SectionTitle>

        <div className="space-y-3">
          {filtradas.map((e) => {
            const concluida = e.status === "concluida";
            const link = concluida ? `/entrevistas/${e.id}` : null;
            const conteudo = (
              <>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
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
                        <Building2 className="size-3.5 shrink-0 text-muted" />
                        <span className="truncate">{e.forms?.nome}</span>
                      </p>
                      <p className="mt-0.5 truncate text-xs text-muted">
                        {e.profiles?.full_name} · {formatDateTimeBR(e.created_at)}
                      </p>
                      {e.forms?.secretarias?.sigla && (
                        <p className="mt-0.5 truncate text-xs text-muted">
                          {e.forms.secretarias.nome}
                        </p>
                      )}
                    </div>
                  </div>
                  <Badge tone={concluida ? "green" : "amber"}>
                    {concluida ? "Concluída" : "Andamento"}
                  </Badge>
                </div>
                {e.latitude != null && e.longitude != null && (
                  <p className="mt-3 flex items-center gap-1.5 rounded-lg bg-slate-50 px-3 py-1.5 text-xs text-muted">
                    <MapPin className="size-3.5 shrink-0 text-accent" />
                    <span className="truncate font-mono">
                      {e.latitude.toFixed(5)}, {e.longitude.toFixed(5)}
                    </span>
                  </p>
                )}
              </>
            );
            return (
              <div key={e.id}>
                {link ? (
                  <a href={link} className="block">
                    <Card className="cursor-pointer p-4 transition hover:shadow-card-hover active:scale-[0.99]">
                      {conteudo}
                    </Card>
                  </a>
                ) : (
                  <Card className="p-4">{conteudo}</Card>
                )}
                {link && (
                  <p className="mt-1 px-1 text-right text-[11px] font-medium text-primary">
                    Toque para ver as respostas
                  </p>
                )}
              </div>
            );
          })}
          {filtradas.length === 0 && (
            <EmptyState
              icon={<LayoutDashboard className="size-8" />}
              title="Nenhum registro encontrado"
              description="Ajuste os filtros ou aguarde novos levantamentos."
            />
          )}
        </div>
      </div>
    </>
  );
}
