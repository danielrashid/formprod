"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMapEvents,
} from "react-leaflet";
import type { Map as LeafletMap } from "leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Logo, Badge } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import type { Pessoa, QuerVoltarEstado } from "@/lib/types";
import { maskCPF } from "@/lib/masks";
import { formatDateTimeBR } from "@/lib/dates";
import {
  ArrowLeft,
  MapPin,
  Navigation,
  Users,
  HeartPulse,
  Home,
  X,
  Droplets,
  Stethoscope,
  MapPinned,
  User,
  ChevronDown,
  ChevronUp,
  FileText,
  Loader2,
  PlusCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";

const DF_CENTER: [number, number] = [-15.7942, -47.8822];

const TIPOS_MAPA = {
  padrao: {
    label: "Padrão",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  },
  satelite: {
    label: "Satélite",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  },
} as const;

type TipoMapa = keyof typeof TIPOS_MAPA;

const COR_PADRAO = "#2563eb";
const COR_RETORNO = "#0d9488";
const COR_DOENCA = "#dc2626";

function corPessoa(p: Pessoa): string {
  if (p.tem_doenca) return COR_DOENCA;
  if (p.quer_voltar_estado === "sim") return COR_RETORNO;
  return COR_PADRAO;
}

function fundoPin(p: Pessoa): string {
  const doenca = p.tem_doenca;
  const retorno = p.quer_voltar_estado === "sim";
  if (doenca && retorno) {
    return `linear-gradient(135deg, ${COR_DOENCA} 50%, ${COR_RETORNO} 50%)`;
  }
  return corPessoa(p);
}

function makeIcon(p: Pessoa, selecionada: boolean, entrevistas?: number) {
  const cor = fundoPin(p);
  const s = selecionada ? 1.2 : 1;
  const badge =
    entrevistas && entrevistas > 0
      ? `<div style="position:absolute;right:-6px;bottom:-6px;min-width:18px;height:18px;border-radius:9999px;background:#16a34a;border:2px solid #fff;color:#fff;font-weight:800;font-size:11px;font-family:Arial,sans-serif;display:grid;place-items:center;padding:0 3px;">${
          entrevistas > 9 ? "9+" : entrevistas
        }</div>`
      : "";
  return L.divIcon({
    className: "",
    html: `<div style="position:relative;width:${36 * s}px;height:${36 * s}px;">
      <div style="position:absolute;inset:0;background:${cor};border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 3px 8px rgba(0,0,0,.4);border:2px solid #fff;"></div>
      <div style="position:absolute;inset:0;display:grid;place-items:center;color:#fff;font-weight:800;font-size:${15 * s}px;font-family:Arial,sans-serif;">${p.nome.charAt(0)}</div>
      ${badge}
    </div>`,
    iconSize: [36 * s, 36 * s],
    iconAnchor: [18 * s, 36 * s],
    popupAnchor: [0, -36 * s],
  });
}

function ClickHandler({ onSelect }: { onSelect: (p: Pessoa | null) => void }) {
  useMapEvents({
    click() {
      onSelect(null);
    },
  });
  return null;
}

function FlyTo({ target }: { target: [number, number] | null }) {
  const map = useMapEvents({});
  useEffect(() => {
    if (target) {
      map.flyTo(target, 15, { duration: 0.8 });
    }
  }, [target, map]);
  return null;
}

const QUER_VOLTAR_LABEL: Record<QuerVoltarEstado, string> = {
  sim: "Quer voltar",
  nao: "Não quer voltar",
  nao_sabe: "Não sabe",
};

interface EntrevistaDetalhe {
  id: string;
  status: string;
  created_at: string;
  agente: string | null;
  respostas: { pergunta: string; valor: string }[];
}

function formatarValor(v: unknown): string {
  if (v == null) return "—";
  if (Array.isArray(v)) return v.join(", ");
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    if (
      typeof o.lat === "number" &&
      typeof o.lng === "number"
    ) {
      return `${o.lat.toFixed(5)}, ${o.lng.toFixed(5)}`;
    }
    return JSON.stringify(v);
  }
  return String(v);
}

function isImagem(v: string): boolean {
  return /^https?:\/\/.+\.(jpe?g|png|webp|gif|heic|heif)(\?.*)?$/i.test(v);
}

export function MapaPessoas({
  pessoas,
  entrevistasPorPessoa,
  forms,
  agenteId,
}: {
  pessoas: Pessoa[];
  entrevistasPorPessoa: Record<string, number>;
  forms: { id: string; nome: string }[];
  agenteId: string;
}) {
  const router = useRouter();
  const [selecionada, setSelecionada] = useState<Pessoa | null>(null);
  const [filtroRA, setFiltroRA] = useState<string>("Todas");
  const [mapReady, setMapReady] = useState(false);
  const [entrevistas, setEntrevistas] = useState<EntrevistaDetalhe[] | null>(null);
  const [carregandoEntrevistas, setCarregandoEntrevistas] = useState(false);
  const [expandido, setExpandido] = useState(false);
  const [mostrarForms, setMostrarForms] = useState(false);
  const [iniciandoFormId, setIniciandoFormId] = useState<string | null>(null);
  const [erroNovaEntrevista, setErroNovaEntrevista] = useState<string | null>(null);
  const [tipoMapa, setTipoMapa] = useState<TipoMapa>("padrao");
  const mapRef = useRef<LeafletMap | null>(null);

  const ras = useMemo(() => {
    const set = new Set(pessoas.map((p) => p.ra).filter(Boolean) as string[]);
    return ["Todas", ...[...set].sort()];
  }, [pessoas]);

  const filtradas = useMemo(
    () =>
      filtroRA === "Todas"
        ? pessoas
        : pessoas.filter((p) => p.ra === filtroRA),
    [pessoas, filtroRA]
  );

  const target: [number, number] | null = selecionada
    ? [selecionada.latitude, selecionada.longitude]
    : null;

  const wazeUrl = selecionada
    ? `https://waze.com/ul?ll=${selecionada.latitude},${selecionada.longitude}&navigate=yes`
    : "";
  const gmapsUrl = selecionada
    ? `https://www.google.com/maps/dir/?api=1&destination=${selecionada.latitude},${selecionada.longitude}`
    : "";

  useEffect(() => {
    if (!mapReady) return;
    const map = mapRef.current;
    if (map) {
      const bounds = L.latLngBounds(
        filtradas.map((p) => [p.latitude, p.longitude] as [number, number])
      );
      if (filtradas.length === 1) {
        map.flyTo([filtradas[0].latitude, filtradas[0].longitude], 15, {
          duration: 0.8,
        });
      } else if (filtradas.length > 1) {
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroRA, mapReady]);

  async function carregarEntrevistas(pessoaId: string) {
    setCarregandoEntrevistas(true);
    const supabase = createClient();
    const { data } = await supabase.rpc("entrevistas_do_cidadao", {
      cidadao_id: pessoaId,
    });
    const rows = (data ?? []) as Array<{
      id: string;
      status: string;
      created_at: string;
      agente_nome: string | null;
      respostas: { pergunta: string; valor: unknown }[];
    }>;
    const lista: EntrevistaDetalhe[] = rows.map((e) => ({
      id: e.id,
      status: e.status,
      created_at: e.created_at,
      agente: e.agente_nome ?? null,
      respostas: (e.respostas ?? []).map((r) => ({
        pergunta: r.pergunta,
        valor: formatarValor(r.valor),
      })),
    }));
    setEntrevistas(lista);
    setCarregandoEntrevistas(false);
  }

  function selecionar(p: Pessoa | null) {
    setSelecionada(p);
    setExpandido(false);
    setEntrevistas(null);
    setMostrarForms(false);
    setIniciandoFormId(null);
    setErroNovaEntrevista(null);
    if (p) carregarEntrevistas(p.id);
  }

  async function iniciarEntrevista(formId: string) {
    if (!selecionada || iniciandoFormId) return;
    setIniciandoFormId(formId);
    setErroNovaEntrevista(null);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("entrevistas")
      .insert({
        form_id: formId,
        agente_id: agenteId,
        pessoa_id: selecionada.id,
      })
      .select("id")
      .single();
    if (error || !data) {
      setErroNovaEntrevista("Não foi possível iniciar a entrevista. Tente novamente.");
      setIniciandoFormId(null);
      return;
    }
    router.push(`/entrevistas/${data.id}`);
  }

  return (
    <main className="flex h-dvh flex-col bg-slate-900">
      <header className="bg-gradient-to-br from-slate-900 via-primary-dark to-primary text-white shadow-lg">
        <div className="mx-auto flex max-w-xl items-center justify-between px-4 pt-[calc(env(safe-area-inset-top)+0.5rem)] pb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/")}
              className="grid size-10 place-items-center rounded-full bg-white/10 transition hover:bg-white/20"
              title="Voltar"
            >
              <ArrowLeft className="size-5" />
            </button>
            <div>
              <h1 className="flex items-center gap-1.5 text-base font-bold">
                <MapPinned className="size-4 text-accent" />
                Mapa de pessoas
              </h1>
              <p className="text-xs text-white/70">
                {filtradas.length} registros · toque para ver os dados
              </p>
            </div>
          </div>
          <Logo small />
        </div>
        <div className="mx-auto max-w-xl overflow-x-auto px-4 pb-3 no-scrollbar">
          <div className="flex gap-2">
            {ras.map((ra) => (
              <button
                key={ra}
                onClick={() => setFiltroRA(ra)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  filtroRA === ra
                    ? "bg-white text-primary-dark"
                    : "bg-white/15 text-white hover:bg-white/25"
                }`}
              >
                {ra}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="relative flex-1 overflow-hidden">
        <MapContainer
          center={DF_CENTER}
          zoom={11}
          className="h-full w-full"
          scrollWheelZoom
          zoomControl
          attributionControl={false}
          ref={(map) => {
            mapRef.current = map ?? null;
          }}
          whenReady={() => setMapReady(true)}
        >
          <TileLayer key={tipoMapa} url={TIPOS_MAPA[tipoMapa].url} attribution="" />
          {tipoMapa === "satelite" && (
            <TileLayer
              key="rotulos"
              url="https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png"
              attribution=""
            />
          )}
          <ClickHandler onSelect={selecionar} />
          <FlyTo target={target} />
          {filtradas.map((p) => (
            <Marker
              key={p.id}
              position={[p.latitude, p.longitude]}
              icon={makeIcon(p, selecionada?.id === p.id, entrevistasPorPessoa[p.id] ?? 0)}
              eventHandlers={{ click: () => selecionar(p) }}
            />
          ))}
        </MapContainer>

        {filtradas.length === 0 && (
          <div className="absolute inset-x-0 top-4 z-[800] mx-auto w-fit rounded-xl bg-slate-900/80 px-4 py-2 text-sm text-white backdrop-blur">
            Nenhum registro nesta região.
          </div>
        )}

        <div className="pointer-events-none absolute left-1/2 top-3 z-[800] -translate-x-1/2">
          <div className="pointer-events-auto flex items-center gap-3 rounded-full bg-slate-900/85 px-4 py-2 text-xs font-medium text-white shadow-lg backdrop-blur">
            <span className="flex items-center gap-1">
              <span className="inline-block size-2.5 rounded-full" style={{ background: COR_RETORNO }} />
              Quer voltar
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block size-2.5 rounded-full" style={{ background: COR_DOENCA }} />
              Doença
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block size-2.5 rounded-full" style={{ background: COR_PADRAO }} />
              Outros
            </span>
          </div>
        </div>

        <div className="absolute right-3 top-3 z-[800] flex overflow-hidden rounded-full bg-slate-900/85 text-xs font-semibold text-white shadow-lg backdrop-blur">
          {(Object.keys(TIPOS_MAPA) as TipoMapa[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTipoMapa(t)}
              className={`px-3 py-1.5 transition ${
                tipoMapa === t ? "bg-white text-primary-dark" : "hover:bg-white/15"
              }`}
            >
              {TIPOS_MAPA[t].label}
            </button>
          ))}
        </div>
      </div>

      <div
        className={`absolute inset-x-0 bottom-0 z-[1000] mx-auto max-w-xl rounded-t-3xl bg-white shadow-[0_-8px_30px_rgba(0,0,0,0.2)] transition-transform duration-300 ${
          selecionada ? "translate-y-0" : "translate-y-full"
        }`}
      >
        {selecionada && (
          <div className="max-h-[60vh] overflow-y-auto px-5 pt-4 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
            {selecionada.foto_url && (
              <div className="mb-4 overflow-hidden rounded-2xl border border-border bg-slate-50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selecionada.foto_url}
                  alt={`Foto de ${selecionada.nome}`}
                  className="h-48 w-full object-cover"
                />
              </div>
            )}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className="grid size-12 shrink-0 place-items-center rounded-full text-lg font-bold text-white shadow-md"
                  style={{ background: corPessoa(selecionada) }}
                >
                  {selecionada.nome.charAt(0)}
                </div>
                <div>
                  <h2 className="text-lg font-bold leading-tight text-foreground">
                    {selecionada.nome}
                  </h2>
                  <p className="flex items-center gap-1 text-xs font-medium text-muted">
                    <MapPin className="size-3" />
                    {selecionada.ra ?? "RA não informada"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => selecionar(null)}
                className="grid size-9 place-items-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200"
                title="Fechar"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="mt-4 space-y-2.5">
              <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-3.5 py-2.5">
                <User className="size-4 shrink-0 text-muted" />
                <span className="text-sm text-muted">CPF</span>
                <span className="ml-auto font-medium text-foreground">
                  {selecionada.cpf ? maskCPF(selecionada.cpf) : "—"}
                </span>
              </div>
              <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-3.5 py-2.5">
                <Users className="size-4 shrink-0 text-muted" />
                <span className="text-sm text-muted">Idade / Sexo</span>
                <span className="ml-auto font-medium text-foreground">
                  {selecionada.idade ?? "—"} anos · {selecionada.sexo ?? "—"}
                </span>
              </div>
              <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-3.5 py-2.5">
                <Home className="size-4 shrink-0 text-muted" />
                <span className="text-sm text-muted">Origem / Retorno</span>
                <span className="ml-auto text-right font-medium text-foreground">
                  {selecionada.estado_origem ?? "—"}
                  <span className="block text-xs text-muted">
                    {selecionada.quer_voltar_estado
                      ? QUER_VOLTAR_LABEL[selecionada.quer_voltar_estado]
                      : "—"}
                  </span>
                </span>
              </div>
              <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-3.5 py-2.5">
                <Stethoscope className="size-4 shrink-0 text-muted" />
                <span className="text-sm text-muted">Doença</span>
                <span
                  className={`ml-auto text-right font-medium ${
                    selecionada.tem_doenca ? "text-danger" : "text-foreground"
                  }`}
                >
                  {selecionada.tem_doenca ? selecionada.doenca ?? "Sim" : "Não"}
                </span>
              </div>
              {selecionada.observacoes && (
                <div className="flex items-start gap-3 rounded-xl bg-slate-50 px-3.5 py-2.5">
                  <Droplets className="mt-0.5 size-4 shrink-0 text-muted" />
                  <p className="text-sm leading-relaxed text-foreground">{selecionada.observacoes}</p>
                </div>
              )}
              <div className="flex items-center gap-3 rounded-xl bg-primary-soft px-3.5 py-2.5">
                <HeartPulse className="size-4 shrink-0 text-primary" />
                <span className="text-sm text-muted">Localização</span>
                <span className="ml-auto font-mono text-xs text-primary">
                  {selecionada.latitude.toFixed(5)}, {selecionada.longitude.toFixed(5)}
                </span>
              </div>
            </div>

            <div className="mt-5">
              <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground">
                <Navigation className="size-4 text-primary" />
                Ir até o local
              </p>
              <div className="grid grid-cols-2 gap-3">
                <a
                  href={wazeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 rounded-xl bg-[#33ccff] py-3 text-sm font-bold text-slate-900 shadow-md transition hover:brightness-95 active:scale-[0.98]"
                >
                  <svg viewBox="0 0 24 24" className="size-4 fill-current" aria-hidden>
                    <path d="M12 2 2.6 18h6.8l2.6-5 2.6 5h6.8z" />
                  </svg>
                  Waze
                </a>
                <a
                  href={gmapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 rounded-xl bg-[#4285F4] py-3 text-sm font-bold text-white shadow-md transition hover:brightness-95 active:scale-[0.98]"
                >
                  <MapPin className="size-4" />
                  Google Maps
                </a>
              </div>
            </div>

            <div className="mt-5 border-t border-border pt-4">
              <div className="flex items-center justify-between gap-2">
                <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                  <FileText className="size-4 text-primary" />
                  Entrevistas
                  {entrevistas && (
                    <span className="rounded-full bg-primary-soft px-2 py-0.5 text-xs font-bold text-primary">
                      {entrevistas.length}
                    </span>
                  )}
                </p>
                <div className="flex items-center gap-2">
                  {forms.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setMostrarForms((v) => !v)}
                      className="flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-white shadow-md transition hover:brightness-110 active:scale-[0.98]"
                    >
                      <PlusCircle className="size-3.5" />
                      Nova
                    </button>
                  )}
                  {entrevistas && entrevistas.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setExpandido((v) => !v)}
                      className="flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-slate-200"
                    >
                      {expandido ? "Recolher" : "Expandir"}
                      {expandido ? (
                        <ChevronUp className="size-3.5" />
                      ) : (
                        <ChevronDown className="size-3.5" />
                      )}
                    </button>
                  )}
                </div>
              </div>

              {mostrarForms && forms.length > 0 && (
                <div className="mt-3 space-y-2">
                  <p className="text-xs font-medium text-muted">
                    Escolha o formulário para iniciar a entrevista com{" "}
                    {selecionada.nome.split(" ")[0]}:
                  </p>
                  {forms.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      disabled={iniciandoFormId !== null}
                      onClick={() => iniciarEntrevista(f.id)}
                      className="flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-slate-50 px-3.5 py-2.5 text-left transition hover:border-primary hover:bg-primary-soft disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <span className="text-sm font-semibold text-foreground">{f.nome}</span>
                      {iniciandoFormId === f.id ? (
                        <Loader2 className="size-4 shrink-0 animate-spin text-primary" />
                      ) : (
                        <PlusCircle className="size-4 shrink-0 text-primary" />
                      )}
                    </button>
                  ))}
                </div>
              )}

              {erroNovaEntrevista && (
                <p className="mt-3 rounded-xl bg-danger-soft px-3 py-2 text-xs font-medium text-danger">
                  {erroNovaEntrevista}
                </p>
              )}

              {carregandoEntrevistas && (
                <p className="mt-3 flex items-center gap-2 text-xs font-medium text-muted">
                  <Loader2 className="size-3.5 animate-spin" /> Carregando entrevistas...
                </p>
              )}

              {!carregandoEntrevistas && entrevistas && entrevistas.length === 0 && (
                <p className="mt-3 text-xs text-muted">
                  Nenhuma entrevista vinculada a este cidadão.
                </p>
              )}

              {expandido && entrevistas && entrevistas.length > 0 && (
                <div className="mt-3 space-y-3">
                  {entrevistas.map((e) => (
                    <div
                      key={e.id}
                      className="rounded-xl border border-border bg-slate-50 p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-bold text-foreground">
                          {formatDateTimeBR(e.created_at)}
                        </p>
                        <Badge tone={e.status === "concluida" ? "green" : "amber"}>
                          {e.status === "concluida" ? "Concluída" : "Em andamento"}
                        </Badge>
                      </div>
                      <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-muted">
                        <User className="size-3" />
                        {e.agente ?? "Agente desconhecido"}
                      </p>
                      <div className="mt-2 space-y-1.5">
                        {e.respostas.map((r, i) => (
                          <div key={i} className="text-xs">
                            <p className="font-medium text-slate-600">{r.pergunta}</p>
                            {isImagem(r.valor) ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={r.valor}
                                alt={r.pergunta}
                                className="mt-1 max-h-40 w-full rounded-lg object-cover"
                              />
                            ) : (
                              <p className="leading-relaxed text-foreground">{r.valor}</p>
                            )}
                          </div>
                        ))}
                        {e.respostas.length === 0 && (
                          <p className="text-xs italic text-muted">Sem respostas salvas.</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
