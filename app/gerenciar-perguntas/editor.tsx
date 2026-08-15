"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Question, QuestionType } from "@/lib/types";
import { Logo, Badge } from "@/components/ui";
import {
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Trash2,
  Plus,
  Loader2,
  ListChecks,
  Hash,
  Type,
  Calendar,
  MapPin,
  CheckCircle2,
} from "lucide-react";

interface Props {
  formId: string;
  formNome: string;
  questions: Question[];
}

const TIPOS: { value: QuestionType; label: string; icon: typeof Type }[] = [
  { value: "texto", label: "Texto", icon: Type },
  { value: "numero", label: "Número", icon: Hash },
  { value: "data", label: "Data", icon: Calendar },
  { value: "opcao_unica", label: "Escolha única", icon: ListChecks },
  { value: "opcao_multipla", label: "Múltipla escolha", icon: ListChecks },
  { value: "geoponto", label: "Localização (GPS)", icon: MapPin },
];

const inputClass =
  "w-full rounded-xl border border-border bg-slate-50 px-3 py-2.5 text-sm text-foreground placeholder:text-slate-400 focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20";

export function GerenciarPerguntas({ formId, formNome, questions }: Props) {
  const router = useRouter();
  const [titulo, setTitulo] = useState("");
  const [tipo, setTipo] = useState<QuestionType>("texto");
  const [opcoesTexto, setOpcoesTexto] = useState("");
  const [obrigatoria, setObrigatoria] = useState(true);
  const [msg, setMsg] = useState<{ text: string; tone: "ok" | "error" } | null>(null);
  const [saving, setSaving] = useState(false);

  const showMsg = (text: string, tone: "ok" | "error") => {
    setMsg({ text, tone });
    window.setTimeout(() => setMsg(null), 3500);
  };

  const isOpcoes = tipo === "opcao_unica" || tipo === "opcao_multipla";

  async function criar() {
    if (!titulo.trim()) {
      showMsg("Informe o texto da pergunta.", "error");
      return;
    }
    if (isOpcoes && !opcoesTexto.trim()) {
      showMsg("Informe as opções (uma por linha).", "error");
      return;
    }

    setSaving(true);
    const supabase = createClient();

    const opcoes = isOpcoes
      ? opcoesTexto.split("\n").map((o) => o.trim()).filter(Boolean)
      : [];

    const { error } = await supabase.from("questions").insert({
      form_id: formId,
      titulo: titulo.trim(),
      tipo,
      opcoes,
      obrigatoria,
      ordem: questions.length,
    });

    setSaving(false);
    if (error) {
      showMsg("Erro ao criar pergunta: " + error.message, "error");
      return;
    }

    setTitulo("");
    setOpcoesTexto("");
    setTipo("texto");
    setObrigatoria(true);
    showMsg("Pergunta criada!", "ok");
    router.refresh();
  }

  async function remover(questionId: string) {
    const supabase = createClient();
    const { error } = await supabase
      .from("questions")
      .update({ ativo: false })
      .eq("id", questionId);
    if (!error) router.refresh();
  }

  async function mover(questionId: string, dir: -1 | 1) {
    const idx = questions.findIndex((q) => q.id === questionId);
    const alvo = idx + dir;
    if (idx < 0 || alvo < 0 || alvo >= questions.length) return;

    const supabase = createClient();
    const atual = questions[idx];
    const outro = questions[alvo];

    await supabase
      .from("questions")
      .update({ ordem: outro.ordem })
      .eq("id", atual.id);
    await supabase
      .from("questions")
      .update({ ordem: atual.ordem })
      .eq("id", outro.id);
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-slate-900 pb-28">
      <header className="bg-gradient-to-br from-slate-900 via-primary-dark to-primary pb-5 pt-4 text-white shadow-lg">
        <div className="mx-auto flex max-w-xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/")}
              className="grid size-10 place-items-center rounded-full bg-white/10 transition hover:bg-white/20"
              title="Voltar"
            >
              <ArrowLeft className="size-5" />
            </button>
            <div>
              <h1 className="text-lg font-bold">Perguntas do formulário</h1>
              <p className="text-xs text-white/70">{formNome}</p>
            </div>
          </div>
          <Logo small />
        </div>
      </header>

      <div className="mx-auto max-w-xl px-4 pt-5">
        {msg && (
          <div
            className={`mb-4 rounded-xl px-3 py-2.5 text-sm ${
              msg.tone === "ok"
                ? "bg-success-soft text-success"
                : "bg-danger-soft text-danger"
            }`}
          >
            {msg.text}
          </div>
        )}

        <section className="rounded-2xl bg-surface shadow-card">
          <div className="border-b border-border px-5 py-3.5">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Plus className="size-4 text-primary" />
              Nova pergunta
            </h2>
          </div>
          <div className="space-y-4 px-5 py-5">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Texto da pergunta
              </label>
              <input
                type="text"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ex: Você deseja voltar para sua cidade de origem?"
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Tipo de resposta
              </label>
              <div className="grid grid-cols-2 gap-2">
                {TIPOS.map((t) => {
                  const active = tipo === t.value;
                  return (
                    <button
                      key={t.value}
                      onClick={() => setTipo(t.value)}
                      className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
                        active
                          ? "border-primary bg-primary-soft text-primary"
                          : "border-border bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <t.icon className="size-4" />
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {isOpcoes && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Opções (uma por linha)
                </label>
                <textarea
                  value={opcoesTexto}
                  onChange={(e) => setOpcoesTexto(e.target.value)}
                  rows={4}
                  placeholder={"Sim\nNão\nNão sei"}
                  className={inputClass}
                />
              </div>
            )}

            <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-border bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={obrigatoria}
                onChange={(e) => setObrigatoria(e.target.checked)}
                className="size-4"
              />
              Pergunta obrigatória
            </label>

            <button
              onClick={criar}
              disabled={saving}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-white shadow-lg shadow-primary/25 transition hover:bg-primary-hover disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Plus className="size-4" />
              )}
              Adicionar pergunta
            </button>
          </div>
        </section>

        <section className="mt-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
              Perguntas atuais
            </h2>
            <span className="text-xs font-medium text-muted">
              {questions.length} perguntas
            </span>
          </div>
          <div className="space-y-3">
            {questions.map((q, idx) => {
              const tipoInfo = TIPOS.find((t) => t.value === q.tipo);
              const TipoIcon = tipoInfo?.icon ?? Type;
              return (
                <div key={q.id} className="rounded-2xl bg-surface p-4 shadow-card">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium leading-snug text-foreground">
                        <span className="mr-1.5 inline-grid size-6 place-items-center rounded-full bg-primary-soft text-xs font-bold text-primary align-middle">
                          {idx + 1}
                        </span>
                        {q.titulo}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <Badge tone="blue">
                          <TipoIcon className="size-3" />
                          {tipoInfo?.label}
                        </Badge>
                        {q.obrigatoria && <Badge tone="amber">Obrigatória</Badge>}
                        {(q.tipo === "opcao_unica" || q.tipo === "opcao_multipla") && (
                          <Badge>{q.opcoes?.length ?? 0} opções</Badge>
                        )}
                        {q.tipo === "geoponto" && (
                          <span className="flex items-center gap-1 text-xs text-accent">
                            <CheckCircle2 className="size-3" /> captura automática
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col gap-1">
                      <div className="flex gap-1">
                        <button
                          onClick={() => mover(q.id, -1)}
                          disabled={idx === 0}
                          title="Mover para cima"
                          className="grid size-8 place-items-center rounded-lg bg-slate-100 text-slate-600 transition hover:bg-slate-200 disabled:opacity-40"
                        >
                          <ArrowUp className="size-4" />
                        </button>
                        <button
                          onClick={() => mover(q.id, 1)}
                          disabled={idx === questions.length - 1}
                          title="Mover para baixo"
                          className="grid size-8 place-items-center rounded-lg bg-slate-100 text-slate-600 transition hover:bg-slate-200 disabled:opacity-40"
                        >
                          <ArrowDown className="size-4" />
                        </button>
                      </div>
                      <button
                        onClick={() => remover(q.id)}
                        title="Excluir pergunta"
                        className="grid size-8 place-items-center rounded-lg bg-danger-soft text-danger transition hover:bg-danger/10"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            {questions.length === 0 && (
              <div className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-border bg-surface-muted px-6 py-10 text-center">
                <ListChecks className="size-8 text-muted" />
                <p className="text-sm font-semibold">Nenhuma pergunta ainda</p>
                <p className="max-w-xs text-xs text-muted">
                  Crie a primeira pergunta para começar a montar o formulário.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
