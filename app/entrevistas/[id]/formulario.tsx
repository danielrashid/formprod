"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Question, QuestionType } from "@/lib/types";
import { Logo, Badge } from "@/components/ui";
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Check,
  CheckCircle2,
  Loader2,
  LocateFixed,
  MapPin,
  Save,
  Hash,
  Type,
  ListChecks,
  Send,
} from "lucide-react";

interface Props {
  entrevistaId: string;
  formNome: string;
  status: string;
  observacoes: string | null;
  latitude: number | null;
  longitude: number | null;
  questions: Question[];
  initialAnswers: Map<string, unknown>;
}

const TIPOS: Record<QuestionType, { label: string; icon: typeof Type }> = {
  texto: { label: "Texto", icon: Type },
  numero: { label: "Número", icon: Hash },
  data: { label: "Data", icon: Calendar },
  opcao_unica: { label: "Escolha única", icon: ListChecks },
  opcao_multipla: { label: "Múltipla escolha", icon: ListChecks },
  geoponto: { label: "Localização (GPS)", icon: MapPin },
};

const inputClass =
  "w-full rounded-xl border border-border bg-slate-50 px-3 py-2.5 text-sm text-foreground placeholder:text-slate-400 focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20";

export function FormularioDinamico({
  entrevistaId,
  formNome,
  status,
  observacoes,
  latitude,
  longitude,
  questions,
  initialAnswers,
}: Props) {
  const router = useRouter();
  const concluida = status === "concluida";

  const [answers, setAnswers] = useState<Record<string, unknown>>(() => {
    const initial: Record<string, unknown> = {};
    initialAnswers.forEach((v, k) => {
      initial[k] = v;
    });
    return initial;
  });
  const [obs, setObs] = useState(observacoes ?? "");
  const [geo, setGeo] = useState<{ lat: number; lng: number } | null>(
    latitude != null && longitude != null ? { lat: latitude, lng: longitude } : null
  );
  const [saving, setSaving] = useState<"rascunho" | "final" | null>(null);
  const [msg, setMsg] = useState<{ text: string; tone: "info" | "ok" | "error" } | null>(null);
  const [locating, setLocating] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const precisaGeo = questions.some((q) => q.tipo === "geoponto");

  const answeredCount = useMemo(
    () =>
      questions.filter((q) => {
        if (q.tipo === "geoponto") return geo != null;
        const v = answers[q.id];
        if (Array.isArray(v)) return v.length > 0;
        return v != null && v !== "" && v !== false;
      }).length,
    [questions, answers, geo]
  );

  const progress = questions.length
    ? Math.round((answeredCount / questions.length) * 100)
    : 0;

  const showMsg = (text: string, tone: "info" | "ok" | "error") => {
    setMsg({ text, tone });
    window.setTimeout(() => setMsg(null), 3500);
  };

  const capturarLocalizacao = useCallback(() => {
    if (!("geolocation" in navigator)) {
      showMsg("Geolocalização não disponível neste dispositivo.", "error");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeo({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => {
        setLocating(false);
        showMsg("Não foi possível obter a localização. Tente novamente.", "error");
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }, []);

  useEffect(() => {
    if (precisaGeo && !geo) {
      const t = setTimeout(capturarLocalizacao, 0);
      return () => clearTimeout(t);
    }
  }, [capturarLocalizacao, geo, precisaGeo]);

  function setValor(questionId: string, valor: unknown) {
    setAnswers((prev) => ({ ...prev, [questionId]: valor }));
  }

  async function salvar(tipo: "rascunho" | "final") {
    setSaving(tipo);
    setMsg(null);
    const supabase = createClient();

    if (tipo === "final" && precisaGeo && !geo) {
      showMsg("A entrevista requer localização. Capture o GPS antes de concluir.", "error");
      setSaving(null);
      return;
    }

    const rows = questions.map((q) => ({
      entrevista_id: entrevistaId,
      question_id: q.id,
      valor: answers[q.id] ?? null,
    }));

    const { error: answersError } = await supabase
      .from("answers")
      .upsert(rows, { onConflict: "entrevista_id,question_id" });

    const updates: Record<string, unknown> = {
      observacoes: obs,
      status: tipo === "final" ? "concluida" : "em_andamento",
    };
    if (geo) {
      updates.latitude = geo.lat;
      updates.longitude = geo.lng;
    }

    const { error: entrevistaError } = await supabase
      .from("entrevistas")
      .update(updates)
      .eq("id", entrevistaId);

    setSaving(null);

    if (answersError || entrevistaError) {
      showMsg(
        "Erro ao salvar: " +
          (answersError?.message ?? entrevistaError?.message ?? "desconhecido"),
        "error"
      );
      return;
    }

    if (tipo === "final") {
      router.push("/entrevistas");
      router.refresh();
    } else {
      showMsg("Rascunho salvo!", "ok");
    }
  }

  const current = questions[activeIndex];

  const irPara = (idx: number) => {
    if (idx >= 0 && idx < questions.length) setActiveIndex(idx);
  };

  return (
    <main className="min-h-screen bg-slate-900 pb-32">
      <header className="sticky top-0 z-40 bg-gradient-to-br from-slate-900 via-primary-dark to-primary pb-4 pt-4 text-white shadow-lg">
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
              <h1 className="truncate text-base font-bold">{formNome}</h1>
              <p className="text-xs text-white/70">
                Pergunta {Math.min(activeIndex + 1, questions.length)} de {questions.length}
              </p>
            </div>
          </div>
          <Logo small />
        </div>

        <div className="mx-auto mt-4 max-w-xl px-4">
          <div className="h-2 overflow-hidden rounded-full bg-white/15">
            <div
              className="h-full rounded-full bg-gradient-to-r from-accent to-emerald-400 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-1.5 flex justify-between text-[11px] font-medium text-white/70">
            <span>{answeredCount} respondidas</span>
            <span>{progress}%</span>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-xl px-4 pt-5">
        {msg && (
          <div
            className={`mb-4 rounded-xl px-3 py-2.5 text-sm ${
              msg.tone === "ok"
                ? "bg-success-soft text-success"
                : msg.tone === "error"
                  ? "bg-danger-soft text-danger"
                  : "bg-primary-soft text-primary"
            }`}
          >
            {msg.text}
          </div>
        )}

        {/* Cartão de perguntas um-a-um (modo mobile) */}
        {questions.length > 0 && (
          <div className="overflow-hidden rounded-2xl bg-surface shadow-card">
            <div className="flex items-center justify-between gap-2 border-b border-border px-5 py-3.5">
              <Badge tone="blue">{TIPOS[current.tipo].label}</Badge>
              {current.obrigatoria && (
                <span className="text-xs font-medium text-danger">Obrigatória</span>
              )}
            </div>
            <div className="px-5 py-5">
              <p className="mb-4 text-lg font-semibold leading-snug text-foreground">
                {current.titulo}
              </p>
              <CampoPergunta
                question={current}
                valor={answers[current.id]}
                disabled={concluida}
                onChange={(v) => setValor(current.id, v)}
              />
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-4">
              <button
                onClick={() => irPara(activeIndex - 1)}
                disabled={activeIndex === 0}
                className="flex items-center gap-1.5 rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-muted transition hover:bg-slate-50 disabled:opacity-40"
              >
                <ArrowLeft className="size-4" /> Anterior
              </button>
              <button
                onClick={() => irPara(activeIndex + 1)}
                disabled={activeIndex === questions.length - 1}
                className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-hover disabled:opacity-40"
              >
                Próxima <ArrowRight className="size-4" />
              </button>
            </div>
          </div>
        )}

        {/* Localização */}
        {precisaGeo && (
          <div className="mt-5 rounded-2xl bg-surface shadow-card">
            <div className="border-b border-border px-5 py-3.5">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <MapPin className="size-4 text-primary" />
                Localização da entrevista
              </h2>
            </div>
            <div className="px-5 py-4">
              {geo ? (
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm text-success">
                    <CheckCircle2 className="size-5" />
                    <span>
                      {geo.lat.toFixed(5)}, {geo.lng.toFixed(5)}
                    </span>
                  </div>
                  {!concluida && (
                    <button
                      onClick={capturarLocalizacao}
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      Atualizar
                    </button>
                  )}
                </div>
              ) : (
                <button
                  onClick={capturarLocalizacao}
                  disabled={locating || concluida}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-soft px-4 py-3 text-sm font-semibold text-primary transition hover:bg-primary/10 disabled:opacity-50"
                >
                  {locating ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Obtendo localização...
                    </>
                  ) : (
                    <>
                      <LocateFixed className="size-4" />
                      Capturar localização GPS
                    </>
                  )}
                </button>
              )}
              <p className="mt-2 text-center text-xs text-muted">
                A localização é necessária para o registro no ArcGIS.
              </p>
            </div>
          </div>
        )}

        {/* Observações */}
        <div className="mt-5 rounded-2xl bg-surface shadow-card">
          <div className="border-b border-border px-5 py-3.5">
            <h2 className="text-sm font-semibold text-foreground">Observações</h2>
          </div>
          <div className="px-5 py-4">
            <textarea
              value={obs}
              onChange={(e) => setObs(e.target.value)}
              disabled={concluida}
              rows={3}
              className={inputClass}
              placeholder="Anotações gerais sobre a entrevista"
            />
          </div>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-xl gap-3 px-4 py-3">
          {!concluida ? (
            <>
              <button
                onClick={() => salvar("rascunho")}
                disabled={saving !== null}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-primary py-3 text-sm font-semibold text-primary transition hover:bg-primary-soft disabled:opacity-50"
              >
                {saving === "rascunho" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}
                Rascunho
              </button>
              <button
                onClick={() => salvar("final")}
                disabled={saving !== null}
                className="flex flex-[1.4] items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-white shadow-lg shadow-primary/25 transition hover:bg-primary-hover disabled:opacity-50"
              >
                {saving === "final" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
                Concluir entrevista
              </button>
            </>
          ) : (
            <div className="flex w-full items-center justify-center gap-2 py-1 text-sm font-medium text-success">
              <CheckCircle2 className="size-5" />
              Entrevista concluída
              <button
                onClick={() => router.push("/entrevistas")}
                className="ml-auto rounded-lg border border-border px-3 py-1.5 text-sm text-muted"
              >
                Voltar
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function CampoPergunta({
  question,
  valor,
  disabled,
  onChange,
}: {
  question: Question;
  valor: unknown;
  disabled: boolean;
  onChange: (v: unknown) => void;
}) {
  switch (question.tipo) {
    case "texto":
      return (
        <input
          type="text"
          value={typeof valor === "string" ? valor : ""}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={inputClass}
        />
      );
    case "numero":
      return (
        <input
          type="number"
          inputMode="numeric"
          value={typeof valor === "number" ? valor : (valor as string) ?? ""}
          onChange={(e) =>
            onChange(e.target.value === "" ? null : Number(e.target.value))
          }
          disabled={disabled}
          className={inputClass}
        />
      );
    case "data":
      return (
        <input
          type="date"
          value={typeof valor === "string" ? valor : ""}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={inputClass}
        />
      );
    case "opcao_unica": {
      const options = question.opcoes ?? [];
      return (
        <div className="space-y-2">
          {options.map((opcao) => {
            const checked = valor === opcao;
            return (
              <label
                key={opcao}
                className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium transition ${
                  checked
                    ? "border-primary bg-primary-soft text-primary"
                    : "border-border bg-white text-foreground hover:bg-slate-50"
                }`}
              >
                <input
                  type="radio"
                  name={question.id}
                  checked={checked}
                  onChange={() => onChange(opcao)}
                  disabled={disabled}
                  className="size-4"
                />
                <span className="flex-1">{opcao}</span>
                {checked && <Check className="size-4" />}
              </label>
            );
          })}
        </div>
      );
    }
    case "opcao_multipla": {
      const options = question.opcoes ?? [];
      return (
        <div className="space-y-2">
          {options.map((opcao) => {
            const checked = Array.isArray(valor) && valor.includes(opcao);
            return (
              <label
                key={opcao}
                className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium transition ${
                  checked
                    ? "border-primary bg-primary-soft text-primary"
                    : "border-border bg-white text-foreground hover:bg-slate-50"
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => {
                    const atual = Array.isArray(valor) ? (valor as string[]) : [];
                    onChange(
                      e.target.checked
                        ? [...atual, opcao]
                        : atual.filter((o) => o !== opcao)
                    );
                  }}
                  disabled={disabled}
                  className="size-4"
                />
                <span className="flex-1">{opcao}</span>
                {checked && <Check className="size-4" />}
              </label>
            );
          })}
        </div>
      );
    }
    case "geoponto":
      return (
        <p className="flex items-center gap-2 rounded-xl bg-primary-soft px-4 py-3 text-sm text-primary">
          <MapPin className="size-4" /> Capturada no bloco de localização abaixo.
        </p>
      );
    default:
      return null;
  }
}
