"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Pessoa } from "@/lib/types";
import { Logo, Badge } from "@/components/ui";
import {
  ArrowLeft,
  Search,
  UserPlus,
  User,
  Loader2,
  MapPin,
  Stethoscope,
  Home,
  Camera,
  Image as ImageIcon,
  Users,
  Trash2,
  LocateFixed,
  AlertTriangle,
} from "lucide-react";
import { maskCPF, onlyDigits } from "@/lib/masks";
import dynamic from "next/dynamic";

const MapaPicker = dynamic(() => import("@/app/entrevistas/nova/mapa-picker"), {
  ssr: false,
  loading: () => (
    <div className="grid h-56 place-items-center rounded-xl bg-slate-100 text-xs text-muted">
      Carregando mapa...
    </div>
  ),
});

interface Props {
  formId: string;
  formNome: string;
  agenteId: string;
  pessoas: Pessoa[];
}

const inputClass =
  "w-full rounded-xl border border-border bg-slate-50 px-3 py-2.5 text-sm text-foreground placeholder:text-slate-400 focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20";

function normalizarNome(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function distanciaEdicao(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
    prev = cur;
  }
  return prev[b.length];
}

function nomeSimilar(a: string, b: string): boolean {
  const na = normalizarNome(a);
  const nb = normalizarNome(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  const menor = Math.min(na.length, nb.length);
  if (menor < 4) return na === nb;
  return distanciaEdicao(na, nb) <= Math.min(2, Math.max(1, Math.floor(menor / 4)));
}

interface Duplicata {
  pessoa: Pessoa;
  motivo: "cpf" | "nome";
}

async function buscarRA(lat: number, lng: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=jsonv2&accept-language=pt-BR`
    );
    if (!res.ok) return null;
    const j = (await res.json()) as {
      address?: {
        town?: string;
        city?: string;
        village?: string;
        suburb?: string;
        municipality?: string;
        county?: string;
      };
    };
    const a = j.address;
    return (
      a?.town ||
      a?.city ||
      a?.village ||
      a?.suburb ||
      a?.municipality ||
      a?.county ||
      null
    );
  } catch {
    return null;
  }
}

export function NovaEntrevistaClient({ formId, formNome, agenteId, pessoas }: Props) {
  const router = useRouter();
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);

  const [busca, setBusca] = useState("");
  const [filtroRA, setFiltroRA] = useState("");
  const [filtroVoltar, setFiltroVoltar] = useState("");
  const [filtroDoenca, setFiltroDoenca] = useState("");
  const [criando, setCriando] = useState(false);
  const [selecionadaId, setSelecionadaId] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // campos do novo cidadão
  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [idade, setIdade] = useState("");
  const [sexo, setSexo] = useState("");
  const [querVoltar, setQuerVoltar] = useState("");
  const [estadoOrigem, setEstadoOrigem] = useState("");
  const [temDoenca, setTemDoenca] = useState(false);
  const [doenca, setDoenca] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [ra, setRa] = useState("");
  const [buscandoRA, setBuscandoRA] = useState(false);
  const [obtendoLocalizacao, setObtendoLocalizacao] = useState(false);
  const [observacoes, setObservacoes] = useState("");
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [enviandoFoto, setEnviandoFoto] = useState(false);
  const [duplicatas, setDuplicatas] = useState<Duplicata[] | null>(null);
  const inputFotoRef = useRef<HTMLInputElement>(null);

  const ras = useMemo(() => {
    const set = new Set<string>();
    pessoas.forEach((p) => {
      if (p.ra) set.add(p.ra);
    });
    return [...set].sort();
  }, [pessoas]);

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return pessoas.filter((p) => {
      if (
        q &&
        !p.nome.toLowerCase().includes(q) &&
        !(p.cpf ?? "").replace(/\D/g, "").includes(q.replace(/\D/g, ""))
      ) {
        return false;
      }
      if (filtroRA && p.ra !== filtroRA) return false;
      if (filtroVoltar && p.quer_voltar_estado !== filtroVoltar) return false;
      if (filtroDoenca === "sim" && !p.tem_doenca) return false;
      if (filtroDoenca === "nao" && p.tem_doenca) return false;
      return true;
    });
  }, [pessoas, busca, filtroRA, filtroVoltar, filtroDoenca]);

  const temFiltroExtra = filtroRA || filtroVoltar || filtroDoenca;

  const aplicaPonto = useCallback((lat: number, lng: number) => {
    setLatitude(lat);
    setLongitude(lng);
    setBuscandoRA(true);
    buscarRA(lat, lng)
      .then((raNome) => {
        if (raNome) setRa(raNome);
      })
      .finally(() => setBuscandoRA(false));
  }, []);

  const obterLocalizacao = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setErro("Geolocalização não disponível neste dispositivo. Toque no mapa para marcar o ponto.");
      return;
    }
    setObtendoLocalizacao(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setObtendoLocalizacao(false);
        aplicaPonto(pos.coords.latitude, pos.coords.longitude);
      },
      () => {
        setObtendoLocalizacao(false);
        setErro("Não foi possível obter sua localização. Toque no mapa para marcar o ponto do cidadão.");
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }, [aplicaPonto]);

  function abrirCriar() {
    if (!criando) obterLocalizacao();
    setCriando(!criando);
  }

  function supabase() {
    if (!supabaseRef.current) supabaseRef.current = createClient();
    return supabaseRef.current;
  }

  async function escolherPessoa(pessoaId: string) {
    setSelecionadaId(pessoaId);
    setSalvando(true);
    setErro(null);

    const { data, error } = await supabase()
      .from("entrevistas")
      .insert({
        form_id: formId,
        agente_id: agenteId,
        pessoa_id: pessoaId,
      })
      .select("id")
      .single();

    setSalvando(false);
    if (error || !data) {
      setErro("Não foi possível iniciar a entrevista: " + (error?.message ?? ""));
      setSelecionadaId(null);
      return;
    }
    router.push(`/entrevistas/${data.id}`);
  }

  async function criarPessoa() {
    if (!nome.trim()) {
      setErro("Informe o nome do cidadão.");
      return;
    }
    if (latitude == null || longitude == null) {
      setErro("Toque no mapa para marcar o ponto do cidadão.");
      return;
    }
    if (temDoenca && !doenca.trim()) {
      setErro("Informe qual a doença.");
      return;
    }

    setErro(null);

    const cpfDigitos = cpf ? onlyDigits(cpf) : "";
    const { data: existentes } = await supabase()
      .from("pessoas")
      .select("*");
    const achadas: Duplicata[] = [];
    for (const p of (existentes ?? []) as Pessoa[]) {
      if (cpfDigitos && p.cpf && onlyDigits(p.cpf) === cpfDigitos) {
        achadas.push({ pessoa: p, motivo: "cpf" });
      } else if (nomeSimilar(nome, p.nome)) {
        achadas.push({ pessoa: p, motivo: "nome" });
      }
    }
    if (achadas.length > 0) {
      setDuplicatas(achadas);
      return;
    }
    await confirmarCriar();
  }

  async function confirmarCriar() {
    setDuplicatas(null);
    setSalvando(true);

    const novaPessoa = {
      nome: nome.trim(),
      cpf: cpf ? onlyDigits(cpf) : null,
      idade: idade ? Number(idade) : null,
      sexo: (sexo || null) as Pessoa["sexo"],
      quer_voltar_estado: (querVoltar || null) as Pessoa["quer_voltar_estado"],
      estado_origem: estadoOrigem.trim() || null,
      tem_doenca: temDoenca,
      doenca: temDoenca ? doenca.trim() : null,
      ra: ra.trim() || null,
      latitude,
      longitude,
      observacoes: observacoes.trim() || null,
      foto_url: fotoUrl,
    };

    const { data: pessoa, error: pessoaError } = await supabase()
      .from("pessoas")
      .insert(novaPessoa)
      .select("id")
      .single();

    if (pessoaError || !pessoa) {
      setSalvando(false);
      setErro("Erro ao cadastrar cidadão: " + (pessoaError?.message ?? ""));
      return;
    }

    const { data: entrevista, error: entrevistaError } = await supabase()
      .from("entrevistas")
      .insert({ form_id: formId, agente_id: agenteId, pessoa_id: pessoa.id })
      .select("id")
      .single();

    setSalvando(false);
    if (entrevistaError || !entrevista) {
      setErro("Cidadão cadastrado, mas erro ao iniciar entrevista: " + (entrevistaError?.message ?? ""));
      return;
    }
    router.push(`/entrevistas/${entrevista.id}`);
  }

  async function enviarFoto(file: File | null) {
    if (!file || !file.type.startsWith("image/")) return;
    setEnviandoFoto(true);
    const s = supabase();
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `pessoas/${crypto.randomUUID()}.${ext}`;
    const { error } = await s.storage.from("fotos").upload(path, file, {
      contentType: file.type,
      upsert: false,
    });
    if (error) {
      setErro("Erro ao enviar foto: " + error.message);
      setEnviandoFoto(false);
      return;
    }
    const { data } = s.storage.from("fotos").getPublicUrl(path);
    setFotoUrl(data.publicUrl);
    setEnviandoFoto(false);
  }

  return (
    <main className="min-h-screen bg-slate-900 pb-[calc(env(safe-area-inset-bottom)+2rem)]">
      <header className="bg-gradient-to-br from-slate-900 via-primary-dark to-primary pb-5 pt-[calc(env(safe-area-inset-top)+0.5rem)] text-white shadow-lg">
        <div className="mx-auto flex max-w-xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/entrevistas")}
              className="grid size-10 place-items-center rounded-full bg-white/10 transition hover:bg-white/20"
              title="Voltar"
            >
              <ArrowLeft className="size-5" />
            </button>
            <div>
              <h1 className="text-lg font-bold">Vincular cidadão</h1>
              <p className="text-xs text-white/70">{formNome}</p>
            </div>
          </div>
          <Logo small />
        </div>
      </header>

      <div className="mx-auto max-w-xl px-4 pt-5">
        {erro && (
          <div className="mb-4 rounded-xl bg-danger-soft px-3 py-2.5 text-sm text-danger">
            {erro}
          </div>
        )}

        <div className="mb-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome ou CPF..."
              className={`${inputClass} pl-9`}
            />
          </div>

          <div className="mt-2 grid grid-cols-3 gap-2">
            <select
              value={filtroRA}
              onChange={(e) => setFiltroRA(e.target.value)}
              className={inputClass}
            >
              <option value="">RA: todas</option>
              {ras.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <select
              value={filtroVoltar}
              onChange={(e) => setFiltroVoltar(e.target.value)}
              className={inputClass}
            >
              <option value="">Quer voltar: todos</option>
              <option value="sim">Quer voltar</option>
              <option value="nao">Não quer</option>
              <option value="nao_sabe">Não sabe</option>
            </select>
            <select
              value={filtroDoenca}
              onChange={(e) => setFiltroDoenca(e.target.value)}
              className={inputClass}
            >
              <option value="">Doença: todas</option>
              <option value="sim">Com doença</option>
              <option value="nao">Sem doença</option>
            </select>
          </div>

          <div className="mt-1.5 flex items-center justify-between">
            <p className="text-xs text-muted">
              {filtradas.length} cidadãos encontrados
            </p>
            {temFiltroExtra && (
              <button
                type="button"
                onClick={() => {
                  setFiltroRA("");
                  setFiltroVoltar("");
                  setFiltroDoenca("");
                }}
                className="text-xs font-medium text-primary hover:underline"
              >
                Limpar filtros
              </button>
            )}
          </div>
        </div>

        <div className="space-y-2">
          {filtradas.map((p) => {
            const selected = selecionadaId === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => escolherPessoa(p.id)}
                disabled={salvando}
                className={`flex w-full items-center gap-3 rounded-2xl bg-surface p-3.5 text-left shadow-card transition active:scale-[0.99] disabled:opacity-50 ${
                  selected ? "ring-2 ring-primary" : ""
                }`}
              >
                {p.foto_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.foto_url}
                    alt=""
                    className="size-12 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <div className="grid size-12 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
                    <User className="size-6" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-foreground">{p.nome}</p>
                  <p className="truncate text-xs text-muted">
                    {p.cpf ? maskCPF(p.cpf) : "CPF não informado"} · {p.ra ?? "RA não informada"}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {p.tem_doenca && (
                      <Badge tone="amber">
                        <Stethoscope className="size-3" /> Doença
                      </Badge>
                    )}
                    {p.quer_voltar_estado === "sim" && (
                      <Badge tone="blue">
                        <Home className="size-3" /> Quer voltar
                      </Badge>
                    )}
                    {p.quer_voltar_estado === "nao" && (
                      <Badge>
                        <Home className="size-3" /> Não quer
                      </Badge>
                    )}
                    {p.quer_voltar_estado === "nao_sabe" && (
                      <Badge>
                        <Home className="size-3" /> Não sabe
                      </Badge>
                    )}
                  </div>
                </div>
                {salvando && selected ? (
                  <Loader2 className="size-5 shrink-0 animate-spin text-primary" />
                ) : (
                  <span className="shrink-0 text-xs font-semibold text-primary">
                    Iniciar
                  </span>
                )}
              </button>
            );
          })}
          {filtradas.length === 0 && (
            <div className="rounded-2xl border-2 border-dashed border-border bg-surface-muted px-6 py-8 text-center text-sm text-muted">
              Nenhum cidadão encontrado.
            </div>
          )}
        </div>

        <div className="mt-6">
          <button
            type="button"
            onClick={abrirCriar}
            className="flex w-full items-center justify-between rounded-2xl bg-surface px-4 py-3.5 shadow-card transition hover:shadow-card-hover"
          >
            <span className="flex items-center gap-2.5 text-sm font-semibold text-foreground">
              <span className="grid size-9 place-items-center rounded-lg bg-accent-soft text-accent">
                <UserPlus className="size-5" />
              </span>
              Cadastrar nova pessoa
            </span>
            <span className="text-xs font-medium text-muted">{criando ? "Fechar" : "Abrir"}</span>
          </button>

          {criando && (
            <div className="mt-3 space-y-3 rounded-2xl bg-surface p-4 shadow-card">
              {duplicatas && (
                <div className="space-y-2 rounded-xl border border-warning bg-warning-soft p-3">
                  <p className="flex items-center gap-2 text-sm font-semibold text-warning">
                    <AlertTriangle className="size-4 shrink-0" />
                    {duplicatas.length === 1
                      ? "Já existe um cidadão parecido:"
                      : `Já existem ${duplicatas.length} cidadãos parecidos:`}
                  </p>
                  {duplicatas.map((d) => (
                    <div
                      key={d.pessoa.id}
                      className="flex items-center gap-2.5 rounded-lg bg-white p-2.5"
                    >
                      {d.pessoa.foto_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={d.pessoa.foto_url}
                          alt=""
                          className="size-9 shrink-0 rounded-full object-cover"
                        />
                      ) : (
                        <div className="grid size-9 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
                          <User className="size-4" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {d.pessoa.nome}
                        </p>
                        <p className="truncate text-xs text-muted">
                          {d.pessoa.cpf ? maskCPF(d.pessoa.cpf) : "CPF não informado"} ·{" "}
                          {d.pessoa.ra ?? "RA não informada"}
                          <span className="ml-1 font-medium text-warning">
                            {d.motivo === "cpf" ? "CPF igual" : "nome parecido"}
                          </span>
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => escolherPessoa(d.pessoa.id)}
                        disabled={salvando}
                        className="shrink-0 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white transition hover:bg-primary-hover disabled:opacity-50"
                      >
                        Usar este
                      </button>
                    </div>
                  ))}
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={confirmarCriar}
                      disabled={salvando}
                      className="flex-1 rounded-lg border border-warning px-3 py-2 text-xs font-semibold text-warning transition hover:bg-warning/10 disabled:opacity-50"
                    >
                      Cadastrar mesmo assim
                    </button>
                    <button
                      type="button"
                      onClick={() => setDuplicatas(null)}
                      className="flex-1 rounded-lg border border-border bg-white px-3 py-2 text-xs font-semibold text-foreground transition hover:bg-slate-50"
                    >
                      Continuar digitando
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                  Foto do cidadão
                </label>
                {fotoUrl ? (
                  <div className="relative overflow-hidden rounded-xl border border-border bg-slate-50">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={fotoUrl}
                      alt="Foto do cidadão"
                      className="h-48 w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setFotoUrl(null)}
                      className="absolute right-2 top-2 grid size-9 place-items-center rounded-full bg-slate-900/70 text-white transition hover:bg-slate-900"
                      title="Remover foto"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => inputFotoRef.current?.click()}
                      disabled={enviandoFoto}
                      className="flex flex-col items-center gap-1.5 rounded-xl border border-primary bg-primary-soft px-3 py-4 text-sm font-semibold text-primary transition hover:bg-primary/10 disabled:opacity-50"
                    >
                      <Camera className="size-6" /> Tirar foto
                    </button>
                    <button
                      type="button"
                      onClick={() => inputFotoRef.current?.click()}
                      disabled={enviandoFoto}
                      className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-white px-3 py-4 text-sm font-semibold text-foreground transition hover:bg-slate-50 disabled:opacity-50"
                    >
                      <ImageIcon className="size-6" /> Galeria
                    </button>
                  </div>
                )}
                <input
                  ref={inputFotoRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    enviarFoto(e.target.files?.[0] ?? null);
                    e.target.value = "";
                  }}
                />
                {enviandoFoto && (
                  <p className="mt-2 flex items-center justify-center gap-2 text-xs font-medium text-primary">
                    <Loader2 className="size-4 animate-spin" /> Enviando foto...
                  </p>
                )}
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                  Nome completo <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Nome do cidadão"
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600">CPF</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={cpf}
                    onChange={(e) => setCpf(maskCPF(e.target.value))}
                    placeholder="000.000.000-00"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600">Idade</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={idade}
                    onChange={(e) => setIdade(e.target.value)}
                    placeholder="Ex: 45"
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600">Sexo</label>
                  <select value={sexo} onChange={(e) => setSexo(e.target.value)} className={inputClass}>
                    <option value="">—</option>
                    <option value="F">Feminino</option>
                    <option value="M">Masculino</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                    RA <span className="font-normal text-slate-400">(automática)</span>
                  </label>
                  <div className="flex h-[42px] items-center gap-2 rounded-xl border border-border bg-slate-50 px-3 text-sm text-foreground">
                    {buscandoRA ? (
                      <>
                        <Loader2 className="size-4 animate-spin text-primary" />
                        <span className="text-muted">Detectando...</span>
                      </>
                    ) : (
                      <span className="truncate">{ra || "Toque no mapa para detectar"}</span>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                  Quer voltar ao estado de origem?
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { v: "sim", label: "Sim" },
                    { v: "nao", label: "Não" },
                    { v: "nao_sabe", label: "Não sei" },
                  ].map((o) => (
                    <button
                      key={o.v}
                      type="button"
                      onClick={() => setQuerVoltar(o.v)}
                      className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
                        querVoltar === o.v
                          ? "border-primary bg-primary-soft text-primary"
                          : "border-border bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>

              {querVoltar === "sim" && (
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                    Estado de origem
                  </label>
                  <input
                    type="text"
                    value={estadoOrigem}
                    onChange={(e) => setEstadoOrigem(e.target.value)}
                    placeholder="Ex: Piauí"
                    className={inputClass}
                  />
                </div>
              )}

              <div>
                <label className="mb-1.5 flex items-center gap-2 text-xs font-semibold text-slate-600">
                  <input
                    type="checkbox"
                    checked={temDoenca}
                    onChange={(e) => setTemDoenca(e.target.checked)}
                    className="size-4"
                  />
                  Possui doença?
                </label>
                {temDoenca && (
                  <input
                    type="text"
                    value={doenca}
                    onChange={(e) => setDoenca(e.target.value)}
                    placeholder="Qual doença? Ex: Hipertensão"
                    className={`${inputClass} mt-2`}
                  />
                )}
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                  Ponto do cidadão no mapa <span className="text-danger">*</span>
                </label>
                {obtendoLocalizacao ? (
                  <div className="grid h-56 place-items-center rounded-xl border border-border bg-slate-50 text-xs font-medium text-muted">
                    <span className="flex items-center gap-2">
                      <Loader2 className="size-4 animate-spin text-primary" />
                      Obtendo sua localização...
                    </span>
                  </div>
                ) : (
                  <MapaPicker
                    latitude={latitude}
                    longitude={longitude}
                    onChange={(lat, lng) => aplicaPonto(lat, lng)}
                  />
                )}
                {latitude != null && longitude != null && (
                  <div className="mt-2 flex items-center gap-2">
                    <p className="flex flex-1 items-center gap-1.5 rounded-lg bg-primary-soft px-3 py-2 text-xs font-medium text-primary">
                      <MapPin className="size-3.5 shrink-0" />
                      {latitude.toFixed(5)}, {longitude.toFixed(5)}
                    </p>
                    <button
                      type="button"
                      onClick={obterLocalizacao}
                      disabled={obtendoLocalizacao}
                      className="flex shrink-0 items-center gap-1 rounded-lg border border-primary px-3 py-2 text-xs font-semibold text-primary transition hover:bg-primary-soft disabled:opacity-50"
                    >
                      <LocateFixed className="size-3.5" /> Minha posição
                    </button>
                  </div>
                )}
                <p className="mt-2 text-center text-xs text-muted">
                  O ponto inicia onde você está. Toque no mapa para ajustar.
                </p>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                  Observações
                </label>
                <textarea
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  rows={3}
                  placeholder="Anotações sobre o cidadão"
                  className={inputClass}
                />
              </div>

              <button
                type="button"
                onClick={criarPessoa}
                disabled={salvando}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-white shadow-lg shadow-primary/25 transition hover:bg-primary-hover disabled:opacity-50"
              >
                {salvando ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Criando entrevista...
                  </>
                ) : (
                  <>
                    <Users className="size-4" /> Cadastrar e iniciar entrevista
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
