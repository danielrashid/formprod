"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/app/actions/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

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

  if (!nome || !email || senha.length < 6) {
    throw new Error("Preencha nome, email e senha (mín. 6 caracteres).");
  }

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
    user_metadata: { full_name: nome, role, secretaria_id: secretariaId },
  });

  if (error) throw new Error(error.message);
  if (!data.user) throw new Error("Não foi possível criar o usuário.");

  revalidatePath("/admin");
}
