"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/app/actions/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { onlyDigits } from "@/lib/masks";

export type ActionState = { ok: boolean; message: string } | null;

export async function criarSecretaria(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { profile } = await requireProfile();
  if (profile.role !== "admin") {
    return { ok: false, message: "Acesso negado." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("secretarias")
    .insert({
      nome: formData.get("nome"),
      sigla: String(formData.get("sigla")).toUpperCase(),
    });

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/admin");
  return { ok: true, message: "Secretaria criada com sucesso." };
}

export async function criarFormulario(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { profile } = await requireProfile();
  if (profile.role !== "admin") {
    return { ok: false, message: "Acesso negado." };
  }

  const supabase = await createClient();
  const secretariaId = String(formData.get("secretaria_id"));
  const { error } = await supabase.from("forms").insert({
    secretaria_id: secretariaId,
    nome: formData.get("nome"),
    descricao: formData.get("descricao") || null,
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/admin");
  return { ok: true, message: "Formulário criado com sucesso." };
}

export async function atualizarFormulario(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { profile } = await requireProfile();
  if (profile.role !== "admin") {
    return { ok: false, message: "Acesso negado." };
  }

  const formId = String(formData.get("form_id"));
  const secretariaId = String(formData.get("secretaria_id"));
  const nome = String(formData.get("nome"));
  const descricao = String(formData.get("descricao"));

  if (!formId || !nome.trim()) {
    return { ok: false, message: "Informe o nome do formulário." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("forms")
    .update({
      secretaria_id: secretariaId,
      nome: nome.trim(),
      descricao: descricao.trim() || null,
    })
    .eq("id", formId);

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/admin");
  return { ok: true, message: "Formulário atualizado com sucesso." };
}

export async function criarUsuario(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { profile } = await requireProfile();
  if (profile.role !== "admin") {
    return { ok: false, message: "Acesso negado." };
  }

  const nome = String(formData.get("nome"));
  const email = String(formData.get("email"));
  const senha = String(formData.get("senha"));
  const role = String(formData.get("role"));
  const secretariaId = String(formData.get("secretaria_id")) || null;
  const cpf = onlyDigits(String(formData.get("cpf") ?? "")) || null;
  const telefone = onlyDigits(String(formData.get("telefone") ?? "")) || null;

  if (!nome || !email || senha.length < 6) {
    return { ok: false, message: "Preencha nome, email e senha (mín. 6 caracteres)." };
  }

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
    user_metadata: { full_name: nome, role, secretaria_id: secretariaId, cpf, telefone },
  });

  if (error) {
    return { ok: false, message: error.message };
  }
  if (!data.user) {
    return { ok: false, message: "Não foi possível criar o usuário." };
  }

  revalidatePath("/admin");
  return { ok: true, message: `Usuário "${nome}" criado com sucesso.` };
}

export async function atualizarUsuario(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { profile } = await requireProfile();
  if (profile.role !== "admin") {
    return { ok: false, message: "Acesso negado." };
  }

  const userId = String(formData.get("user_id"));
  const senha = String(formData.get("senha"));
  const role = String(formData.get("role"));
  const secretariaId = String(formData.get("secretaria_id")) || null;
  const cpf = onlyDigits(String(formData.get("cpf") ?? "")) || null;
  const telefone = onlyDigits(String(formData.get("telefone") ?? "")) || null;

  if (!userId) {
    return { ok: false, message: "Usuário inválido." };
  }

  const admin = createAdminClient();
  const supabase = await createClient();

  if (senha) {
    if (senha.length < 6) {
      return { ok: false, message: "A nova senha precisa de no mínimo 6 caracteres." };
    }
    const { error: passError } = await admin.auth.admin.updateUserById(userId, {
      password: senha,
    });
    if (passError) {
      return { ok: false, message: passError.message };
    }
  }

  const { error } = await supabase
    .from("profiles")
    .update({ role, secretaria_id: secretariaId, cpf, telefone })
    .eq("id", userId);

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/admin");
  return { ok: true, message: "Usuário atualizado com sucesso." };
}
