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
import { Logo } from "@/components/ui";
import type { Pessoa, QuerVoltarEstado } from "@/lib/types";
import { maskCPF } from "@/lib/masks";
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
} from "lucide-react";
import { useRouter } from "next/navigation";

const DF_CENTER: [number, number] = [-15.7942, -47.8822];

const COR_PADRAO = "#2563eb";
const COR_RETORNO = "#0d9488";
const COR_DOENCA = "#dc2626";

function corPessoa(p: Pessoa): string {
  if (p.tem_doenca) return COR_DOENCA;
  if (p.quer_voltar_estado === "sim") return COR_RETORNO;
  return COR_PADRAO;
}

function makeIcon(p: Pessoa, selecionada: boolean) {
  const cor = corPessoa(p);
  const s = selecionada ? 1.2 : 1;
  return L.divIcon({
    className: "",
    html: `<div style="position:relative;width:${36 * s}px;height:${36 * s}px;">
      <div style="position:absolute;inset:0;background:${cor};border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 3px 8px rgba(0,0,0,.4);border:2px solid #fff;"></div>
      <div style="position:absolute;inset:0;display:grid;place-items:center;color:#fff;font-weight:800;font-size:${15 * s}px;font-family:Arial,sans-serif;">${p.nome.charAt(0)}</div>
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

export function MapaPessoas({ pessoas }: { pessoas: Pessoa[] }) {
  const router = useRouter();
  const [selecionada, setSelecionada] = useState<Pessoa | null>(null);
  const [filtroRA, setFiltroRA] = useState<string>("Todas");
  const [mapReady, setMapReady] = useState(false);
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

  return (
    <main className="flex h-dvh flex-col bg-slate-900">
      <header className="bg-gradient-to-br from-slate-900 via-primary-dark to-primary text-white shadow-lg">
        <div className="mx-auto flex max-w-xl items-center justify-between px-4 pb-4 pt-4">
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
          ref={(map) => {
            mapRef.current = map ?? null;
          }}
          whenReady={() => setMapReady(true)}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickHandler onSelect={setSelecionada} />
          <FlyTo target={target} />
          {filtradas.map((p) => (
            <Marker
              key={p.id}
              position={[p.latitude, p.longitude]}
              icon={makeIcon(p, selecionada?.id === p.id)}
              eventHandlers={{ click: () => setSelecionada(p) }}
            />
          ))}
        </MapContainer>

        {filtradas.length === 0 && (
          <div className="absolute inset-x-0 top-4 mx-auto w-fit rounded-xl bg-slate-900/80 px-4 py-2 text-sm text-white backdrop-blur">
            Nenhum registro nesta região.
          </div>
        )}

        <div className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2">
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
      </div>

      <div
        className={`absolute inset-x-0 bottom-0 z-[1000] mx-auto max-w-xl rounded-t-3xl bg-white shadow-[0_-8px_30px_rgba(0,0,0,0.2)] transition-transform duration-300 ${
          selecionada ? "translate-y-0" : "translate-y-full"
        }`}
      >
        {selecionada && (
          <div className="max-h-[60vh] overflow-y-auto px-5 pb-6 pt-4">
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
                onClick={() => setSelecionada(null)}
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
          </div>
        )}
      </div>
    </main>
  );
}
