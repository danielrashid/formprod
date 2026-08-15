"use client";

import { useState } from "react";
import {
  Building2,
  ChevronDown,
  ClipboardList,
  FilePlus2,
  KeyRound,
  Mail,
  Pencil,
  Phone,
  PlusCircle,
  ShieldCheck,
  UserPlus,
  Users,
} from "lucide-react";
import { criarSecretaria, criarFormulario, criarUsuario, atualizarUsuario } from "@/app/actions/admin";

export type SecretariaAdmin = {
  id: string;
  nome: string;
  sigla: string;
};

export type UsuarioAdmin = {
  id: string;
  full_name: string;
  role: string;
  secretaria_id: string | null;
  secretarias: { nome: string; sigla: string } | null;
  cpf: string | null;
  telefone: string | null;
};

export type FormAdmin = {
  id: string;
  nome: string;
  secretaria_id: string | null;
};

const ROLE_LABEL: Record<string, string> = {
  admin: "Admin",
  editor: "Editor",
  agente: "Agente",
};

const inputClass =
  "w-full rounded-xl border border-border bg-slate-50 px-3 py-2.5 text-sm text-foreground placeholder:text-slate-400 focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20";

const labelClass = "mb-1.5 block text-xs font-semibold text-slate-600";

export function AdminClient({
  secretarias,
  usuarios,
  emails,
  forms,
}: {
  secretarias: SecretariaAdmin[];
  usuarios: UsuarioAdmin[];
  emails: Record<string, string>;
  forms: FormAdmin[];
}) {
  const [tab, setTab] = useState<"usuarios" | "secretarias" | "formularios">("usuarios");
  const [openId, setOpenId] = useState<string | null>(null);
  const [novoUsuarioAberto, setNovoUsuarioAberto] = useState(false);

  const tabs = [
    { id: "usuarios" as const, label: "Usuários", icon: Users, count: usuarios.length },
    { id: "secretarias" as const, label: "Secretarias", icon: Building2, count: secretarias.length },
    { id: "formularios" as const, label: "Formulários", icon: ClipboardList, count: forms.length },
  ];

  return (
    <div>
      {/* Abas */}
      <div className="grid grid-cols-3 gap-2 rounded-2xl bg-surface p-1.5 shadow-card">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex flex-col items-center gap-0.5 rounded-xl px-2 py-2.5 text-xs font-semibold transition ${
              tab === t.id
                ? "bg-primary text-white shadow-md"
                : "text-muted hover:text-foreground"
            }`}
          >
            <t.icon className="size-4.5" />
            {t.label}
            <span className={`text-[10px] font-bold ${tab === t.id ? "text-white/80" : "text-slate-400"}`}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* ================= USUÁRIOS ================= */}
      {tab === "usuarios" && (
        <div className="mt-6">
          <button
            type="button"
            onClick={() => setNovoUsuarioAberto((v) => !v)}
            className="flex w-full items-center justify-between rounded-2xl bg-surface px-4 py-3.5 shadow-card transition hover:shadow-card-hover"
          >
            <span className="flex items-center gap-2.5 text-sm font-semibold text-foreground">
              <span className="grid size-9 place-items-center rounded-lg bg-primary-soft text-primary">
                <UserPlus className="size-5" />
              </span>
              Novo usuário
            </span>
            <ChevronDown
              className={`size-5 text-muted transition ${novoUsuarioAberto ? "rotate-180" : ""}`}
            />
          </button>

          {novoUsuarioAberto && (
            <form action={criarUsuario} className="mt-2 space-y-3 rounded-2xl bg-surface p-4 shadow-card">
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className={labelClass}>Nome completo</label>
                  <input name="nome" required placeholder="Nome completo" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Email</label>
                  <input name="email" type="email" required placeholder="voce@secretaria.gov.br" className={inputClass} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>CPF</label>
                    <input name="cpf" placeholder="000.000.000-00" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Telefone</label>
                    <input name="telefone" placeholder="(61) 90000-0000" className={inputClass} />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Senha inicial</label>
                  <input name="senha" type="password" required minLength={6} placeholder="Mín. 6 caracteres" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Papel</label>
                  <select name="role" required defaultValue="agente" className={inputClass}>
                    <option value="agente">Agente (preenche formulários)</option>
                    <option value="editor">Editor (cria perguntas)</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Secretaria</label>
                  <select name="secretaria_id" defaultValue="" className={inputClass}>
                    <option value="">Sem secretaria</option>
                    {secretarias.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.sigla} — {s.nome}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-white transition hover:bg-primary-hover"
              >
                <PlusCircle className="size-4" />
                Criar usuário
              </button>
            </form>
          )}

          <div className="mt-4 space-y-2">
            {usuarios.map((u) => (
              <div key={u.id} className="rounded-2xl bg-surface shadow-card">
                <div className="flex items-center gap-3 p-3.5">
                  <div className="grid size-10 shrink-0 place-items-center rounded-full bg-slate-100 text-sm font-bold text-slate-600">
                    {u.full_name.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-foreground">{u.full_name}</p>
                    <p className="flex items-center gap-1 truncate text-xs text-muted">
                      <Mail className="size-3 shrink-0" />
                      {emails[u.id] ?? ""}
                    </p>
                    {(u.cpf || u.telefone) && (
                      <p className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted">
                        {u.cpf && <span className="flex items-center gap-1"><ShieldCheck className="size-3" />{u.cpf}</span>}
                        {u.telefone && <span className="flex items-center gap-1"><Phone className="size-3" />{u.telefone}</span>}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        u.role === "admin"
                          ? "bg-primary-soft text-primary"
                          : u.role === "editor"
                            ? "bg-warning-soft text-warning"
                            : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {ROLE_LABEL[u.role] ?? u.role}
                    </span>
                    <span className="text-[11px] font-medium text-muted">
                      {u.secretarias?.sigla ?? "Sem secretaria"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpenId(openId === u.id ? null : u.id)}
                    title="Editar usuário"
                    className={`grid size-9 shrink-0 place-items-center rounded-lg transition ${
                      openId === u.id
                        ? "bg-primary text-white"
                        : "bg-slate-100 text-slate-500 hover:text-primary"
                    }`}
                  >
                    <Pencil className="size-4" />
                  </button>
                </div>

                {openId === u.id && (
                  <form action={atualizarUsuario} className="space-y-3 border-t border-border px-4 py-4">
                    <input type="hidden" name="user_id" value={u.id} />
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelClass}>CPF</label>
                        <input name="cpf" defaultValue={u.cpf ?? ""} className={inputClass} />
                      </div>
                      <div>
                        <label className={labelClass}>Telefone</label>
                        <input name="telefone" defaultValue={u.telefone ?? ""} className={inputClass} />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                      <div>
                        <label className={labelClass}>Papel</label>
                        <select name="role" defaultValue={u.role} className={inputClass}>
                          <option value="agente">Agente (preenche formulários)</option>
                          <option value="editor">Editor (cria perguntas)</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>
                      <div>
                        <label className={labelClass}>Secretaria</label>
                        <select name="secretaria_id" defaultValue={u.secretaria_id ?? ""} className={inputClass}>
                          <option value="">Sem secretaria</option>
                          {secretarias.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.sigla} — {s.nome}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className={labelClass}>
                          <span className="flex items-center gap-1">
                            <KeyRound className="size-3.5" />
                            Nova senha <span className="font-normal text-slate-400">(deixe vazio para manter)</span>
                          </span>
                        </label>
                        <input
                          name="senha"
                          type="password"
                          minLength={6}
                          placeholder="Mín. 6 caracteres"
                          className={inputClass}
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-white transition hover:bg-primary-hover"
                    >
                      <Pencil className="size-4" />
                      Salvar alterações
                    </button>
                  </form>
                )}
              </div>
            ))}
            {usuarios.length === 0 && (
              <div className="rounded-2xl border-2 border-dashed border-border px-6 py-10 text-center text-sm text-muted">
                Nenhum usuário cadastrado ainda.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= SECRETARIAS ================= */}
      {tab === "secretarias" && (
        <div className="mt-6">
          <div className="rounded-2xl bg-surface p-4 shadow-card">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
              <FilePlus2 className="size-4 text-primary" />
              Nova secretaria
            </h2>
            <form action={criarSecretaria} className="space-y-3">
              <div>
                <label className={labelClass}>Nome</label>
                <input name="nome" required placeholder="Ex: Secretaria de Desenvolvimento Social" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Sigla</label>
                <input name="sigla" required placeholder="Ex: SEDES" className={inputClass} />
              </div>
              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-white transition hover:bg-primary-hover"
              >
                <PlusCircle className="size-4" />
                Adicionar secretaria
              </button>
            </form>
          </div>

          <div className="mt-4 space-y-2">
            {secretarias.map((s) => (
              <div key={s.id} className="flex items-center gap-3 rounded-2xl bg-surface p-3.5 shadow-card">
                <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
                  <Building2 className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-foreground">{s.sigla}</p>
                  <p className="truncate text-xs text-muted">{s.nome}</p>
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                  {forms.filter((f) => f.secretaria_id === s.id).length} form(s)
                </span>
              </div>
            ))}
            {secretarias.length === 0 && (
              <div className="rounded-2xl border-2 border-dashed border-border px-6 py-10 text-center text-sm text-muted">
                Nenhuma secretaria cadastrada ainda.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= FORMULÁRIOS ================= */}
      {tab === "formularios" && (
        <div className="mt-6">
          <div className="rounded-2xl bg-surface p-4 shadow-card">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
              <FilePlus2 className="size-4 text-primary" />
              Novo formulário
            </h2>
            <form action={criarFormulario} className="space-y-3">
              <div>
                <label className={labelClass}>Secretaria</label>
                <select name="secretaria_id" required defaultValue="" className={inputClass}>
                  <option value="" disabled>
                    Selecione a secretaria...
                  </option>
                  {secretarias.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.sigla} — {s.nome}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Nome do formulário</label>
                <input name="nome" required placeholder="Ex: Retorno ao lar — SEDES" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Descrição (opcional)</label>
                <input name="descricao" placeholder="Descrição" className={inputClass} />
              </div>
              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-white transition hover:bg-primary-hover"
              >
                <PlusCircle className="size-4" />
                Criar formulário
              </button>
            </form>
          </div>

          <div className="mt-4 space-y-2">
            {forms.map((f) => {
              const sec = secretarias.find((s) => s.id === f.secretaria_id);
              return (
                <div key={f.id} className="flex items-center gap-3 rounded-2xl bg-surface p-3.5 shadow-card">
                  <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
                    <ClipboardList className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-foreground">{f.nome}</p>
                    <p className="truncate text-xs text-muted">{sec ? `${sec.sigla} — ${sec.nome}` : "Sem secretaria"}</p>
                  </div>
                </div>
              );
            })}
            {forms.length === 0 && (
              <div className="rounded-2xl border-2 border-dashed border-border px-6 py-10 text-center text-sm text-muted">
                Nenhum formulário cadastrado ainda.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
