"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  Building2,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  FilePlus2,
  KeyRound,
  ListChecks,
  Loader2,
  Mail,
  Pencil,
  Phone,
  PlusCircle,
  ShieldCheck,
  UserPlus,
  Users,
  XCircle,
} from "lucide-react";
import {
  criarSecretaria,
  criarFormulario,
  criarUsuario,
  atualizarUsuario,
  atualizarFormulario,
  type ActionState,
} from "@/app/actions/admin";
import { maskCPF, maskPhone } from "@/lib/masks";

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
  descricao: string | null;
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

function FormFeedback({ state }: { state: ActionState }) {
  if (!state) return null;
  return (
    <div
      role="status"
      className={`flex items-start gap-2 rounded-xl px-3.5 py-2.5 text-sm ${
        state.ok
          ? "bg-success-soft text-success"
          : "bg-danger-soft text-danger"
      }`}
    >
      {state.ok ? (
        <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
      ) : (
        <XCircle className="mt-0.5 size-4 shrink-0" />
      )}
      <span>{state.message}</span>
    </div>
  );
}

function useAutoClose(state: ActionState, onSuccess: () => void) {
  const closed = useRef(false);
  useEffect(() => {
    if (state?.ok && !closed.current) {
      closed.current = true;
      onSuccess();
    }
  }, [state, onSuccess]);
}

function SubmitButton({
  pending,
  children,
}: {
  pending: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-white transition hover:bg-primary-hover active:scale-[0.98] disabled:opacity-60"
    >
      {pending && <Loader2 className="size-4 animate-spin" />}
      {children}
    </button>
  );
}

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
  const [editFormId, setEditFormId] = useState<string | null>(null);

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
            <NovoUsuarioForm secretarias={secretarias} onSuccess={() => setNovoUsuarioAberto(false)} />
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
                        {u.cpf && (
                          <span className="flex items-center gap-1">
                            <ShieldCheck className="size-3" />
                            {maskCPF(u.cpf)}
                          </span>
                        )}
                        {u.telefone && (
                          <span className="flex items-center gap-1">
                            <Phone className="size-3" />
                            {maskPhone(u.telefone)}
                          </span>
                        )}
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
                  <EditarUsuarioForm usuario={u} secretarias={secretarias} onSuccess={() => setOpenId(null)} />
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
            <NovaSecretariaForm />
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
            <NovoFormularioForm secretarias={secretarias} />
          </div>

          <div className="mt-4 space-y-2">
            {forms.map((f) => {
              const sec = secretarias.find((s) => s.id === f.secretaria_id);
              return (
                <div key={f.id} className="rounded-2xl bg-surface shadow-card">
                  <div className="flex items-center gap-3 p-3.5">
                    <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
                      <ClipboardList className="size-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-foreground">{f.nome}</p>
                      <p className="truncate text-xs text-muted">{sec ? `${sec.sigla} — ${sec.nome}` : "Sem secretaria"}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <a
                        href={`/gerenciar-perguntas?form=${f.id}`}
                        title="Editar perguntas"
                        className="flex items-center gap-1 rounded-lg bg-primary-soft px-2.5 py-2 text-xs font-semibold text-primary transition hover:bg-primary/15"
                      >
                        <ListChecks className="size-4" />
                        Perguntas
                      </a>
                      <button
                        type="button"
                        onClick={() => setEditFormId(editFormId === f.id ? null : f.id)}
                        title="Editar formulário"
                        className={`grid size-9 shrink-0 place-items-center rounded-lg transition ${
                          editFormId === f.id
                            ? "bg-primary text-white"
                            : "bg-slate-100 text-slate-500 hover:text-primary"
                        }`}
                      >
                        <Pencil className="size-4" />
                      </button>
                    </div>
                  </div>
                  {editFormId === f.id && (
                    <EditarFormularioForm
                      form={f}
                      secretarias={secretarias}
                      onSuccess={() => setEditFormId(null)}
                    />
                  )}
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

function NovoUsuarioForm({ secretarias, onSuccess }: { secretarias: SecretariaAdmin[]; onSuccess: () => void }) {
  const [state, formAction, pending] = useActionState(criarUsuario, null);
  useAutoClose(state, onSuccess);

  return (
    <form action={formAction} className="mt-2 space-y-3 rounded-2xl bg-surface p-4 shadow-card">
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
            <input
              name="cpf"
              inputMode="numeric"
              placeholder="000.000.000-00"
              onInput={(e) => (e.currentTarget.value = maskCPF(e.currentTarget.value))}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Telefone</label>
            <input
              name="telefone"
              inputMode="tel"
              placeholder="(61) 90000-0000"
              onInput={(e) => (e.currentTarget.value = maskPhone(e.currentTarget.value))}
              className={inputClass}
            />
          </div>
        </div>
        <div>
          <label className={labelClass}>Senha inicial</label>
          <input name="senha" type="password" required minLength={6} placeholder="Mín. 6 caracteres" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Perfil</label>
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

      <FormFeedback state={state} />

      <SubmitButton pending={pending}>
        {pending ? "Criando..." : (
          <>
            <PlusCircle className="size-4" />
            Criar usuário
          </>
        )}
      </SubmitButton>
    </form>
  );
}

function EditarUsuarioForm({
  usuario,
  secretarias,
  onSuccess,
}: {
  usuario: UsuarioAdmin;
  secretarias: SecretariaAdmin[];
  onSuccess: () => void;
}) {
  const [state, formAction, pending] = useActionState(atualizarUsuario, null);
  useAutoClose(state, onSuccess);

  return (
    <form action={formAction} className="space-y-3 border-t border-border px-4 py-4">
      <input type="hidden" name="user_id" value={usuario.id} />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>CPF</label>
          <input
            name="cpf"
            inputMode="numeric"
            defaultValue={usuario.cpf ?? ""}
            onInput={(e) => (e.currentTarget.value = maskCPF(e.currentTarget.value))}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Telefone</label>
          <input
            name="telefone"
            inputMode="tel"
            defaultValue={usuario.telefone ?? ""}
            onInput={(e) => (e.currentTarget.value = maskPhone(e.currentTarget.value))}
            className={inputClass}
          />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3">
        <div>
          <label className={labelClass}>Perfil</label>
          <select name="role" defaultValue={usuario.role} className={inputClass}>
            <option value="agente">Agente (preenche formulários)</option>
            <option value="editor">Editor (cria perguntas)</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Secretaria</label>
          <select name="secretaria_id" defaultValue={usuario.secretaria_id ?? ""} className={inputClass}>
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

      <FormFeedback state={state} />

      <SubmitButton pending={pending}>
        {pending ? "Salvando..." : (
          <>
            <Pencil className="size-4" />
            Salvar alterações
          </>
        )}
      </SubmitButton>
    </form>
  );
}

function NovaSecretariaForm() {
  const [state, formAction, pending] = useActionState(criarSecretaria, null);

  return (
    <form action={formAction} className="space-y-3">
      <div>
        <label className={labelClass}>Nome</label>
        <input name="nome" required placeholder="Ex: Secretaria de Desenvolvimento Social" className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Sigla</label>
        <input name="sigla" required placeholder="Ex: SEDES" className={inputClass} />
      </div>

      <FormFeedback state={state} />

      <SubmitButton pending={pending}>
        {pending ? "Adicionando..." : (
          <>
            <PlusCircle className="size-4" />
            Adicionar secretaria
          </>
        )}
      </SubmitButton>
    </form>
  );
}

function NovoFormularioForm({ secretarias }: { secretarias: SecretariaAdmin[] }) {
  const [state, formAction, pending] = useActionState(criarFormulario, null);

  return (
    <form action={formAction} className="space-y-3">
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

      <FormFeedback state={state} />

      <SubmitButton pending={pending}>
        {pending ? "Criando..." : (
          <>
            <PlusCircle className="size-4" />
            Criar formulário
          </>
        )}
      </SubmitButton>
    </form>
  );
}

function EditarFormularioForm({
  form,
  secretarias,
  onSuccess,
}: {
  form: FormAdmin;
  secretarias: SecretariaAdmin[];
  onSuccess: () => void;
}) {
  const [state, formAction, pending] = useActionState(atualizarFormulario, null);
  useAutoClose(state, onSuccess);

  return (
    <form action={formAction} className="space-y-3 border-t border-border px-4 py-4">
      <input type="hidden" name="form_id" value={form.id} />
      <div>
        <label className={labelClass}>Nome do formulário</label>
        <input name="nome" required defaultValue={form.nome} className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Descrição (opcional)</label>
        <input name="descricao" defaultValue={form.descricao ?? ""} placeholder="Descrição" className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Secretaria</label>
        <select name="secretaria_id" defaultValue={form.secretaria_id ?? ""} className={inputClass}>
          <option value="">Sem secretaria</option>
          {secretarias.map((s) => (
            <option key={s.id} value={s.id}>
              {s.sigla} — {s.nome}
            </option>
          ))}
        </select>
      </div>

      <FormFeedback state={state} />

      <SubmitButton pending={pending}>
        {pending ? "Salvando..." : (
          <>
            <Pencil className="size-4" />
            Salvar formulário
          </>
        )}
      </SubmitButton>
    </form>
  );
}
