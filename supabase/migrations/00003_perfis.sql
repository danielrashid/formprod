-- ============================================================
-- Perfis: CPF e telefone + edição de usuário pelo admin
-- ============================================================

alter table public.profiles
  add column if not exists cpf text,
  add column if not exists telefone text;

-- Atualizar trigger para capturar cpf/telefone dos metadados
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role, secretaria_id, cpf, telefone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'role', 'agente')::public.user_role,
    nullif(new.raw_user_meta_data ->> 'secretaria_id', '')::uuid,
    nullif(new.raw_user_meta_data ->> 'cpf', ''),
    nullif(new.raw_user_meta_data ->> 'telefone', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
