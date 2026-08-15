"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/app/actions/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { onlyDigits } from "@/lib/masks";

export async function criarSecretaria(formData: FormData) {
  const { profile } = await requireProfile();
  if (profile.role !== "admin") return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("secretarias")
    .insert({
      nome: formData.get("nome"),
      sigla: String(formData.get("sigla")).toUpperCase(),
    });

  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

export async function criarFormulario(formData: FormData) {
  const { profile } = await requireProfile();
  if (profile.role !== "admin") return;

  const supabase = await createClient();
  const secretariaId = String(formData.get("secretaria_id"));
  const { error } = await supabase.from("forms").insert({
    secretaria_id: secretariaId,
    nome: formData.get("nome"),
    descricao: formData.get("descricao") || null,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

export async function criarUsuario(formData: FormData) {
  const { profile } = await requireProfile();
  if (profile.role !== "admin") return;

  const nome = String(formData.get("nome"));
  const email = String(formData.get("email"));
  const senha = String(formData.get("senha"));
  const role = String(formData.get("role"));
  const secretariaId = String(formData.get("secretaria_id")) || null;
  const cpf = onlyDigits(String(formData.get("cpf") ?? "")) || null;
  const telefone = onlyDigits(String(formData.get("telefone") ?? "")) || null;

  if (!nome || !email || senha.length < 6) {
    throw new Error("Preencha nome, email e senha (mín. 6 caracteres).");
  }

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
    user_metadata: { full_name: nome, role, secretaria_id: secretariaId, cpf, telefone },
  });

  if (error) throw new Error(error.message);
  if (!data.user) throw new Error("Não foi possível criar o usuário.");

  revalidatePath("/admin");
}

export async function atualizarUsuario(formData: FormData) {
  const { profile } = await requireProfile();
  if (profile.role !== "admin") return;

  const userId = String(formData.get("user_id"));
  const senha = String(formData.get("senha"));
  const role = String(formData.get("role"));
  const secretariaId = String(formData.get("secretaria_id")) || null;
  const cpf = onlyDigits(String(formData.get("cpf") ?? "")) || null;
  const telefone = onlyDigits(String(formData.get("telefone") ?? "")) || null;

  if (!userId) return;

  const admin = createAdminClient();
  const supabase = await createClient();

  if (senha) {
    if (senha.length < 6) {
      throw new Error("A nova senha precisa de no mínimo 6 caracteres.");
    }
    const { error: passError } = await admin.auth.admin.updateUserById(userId, {
      password: senha,
    });
    if (passError) throw new Error(passError.message);
  }

  const { error } = await supabase
    .from("profiles")
    .update({ role, secretaria_id: secretariaId, cpf, telefone })
    .eq("id", userId);

  if (error) throw new Error(error.message);

  revalidatePath("/admin");
}
