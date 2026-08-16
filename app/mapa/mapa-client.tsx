"use client";

import dynamic from "next/dynamic";
import type { Pessoa } from "@/lib/types";

const MapaPessoas = dynamic(() => import("@/app/mapa/mapa").then((m) => m.MapaPessoas), {
  ssr: false,
  loading: () => (
    <div className="grid min-h-dvh place-items-center bg-slate-900 text-sm text-white/60">
      Carregando mapa...
    </div>
  ),
});

export function MapaClient({
  pessoas,
  entrevistasPorPessoa,
}: {
  pessoas: Pessoa[];
  entrevistasPorPessoa: Record<string, number>;
}) {
  return <MapaPessoas pessoas={pessoas} entrevistasPorPessoa={entrevistasPorPessoa} />;
}
