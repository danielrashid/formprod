-- ============================================================
-- Schema inicial — DF-Legal (levantamento por secretaria)
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- SECRETARIAS ----------
create table if not exists public.secretarias (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  sigla text not null unique,
  created_at timestamptz not null default now()
);

-- ---------- PERFIS (usuários) ----------
do $$ begin
  create type public.user_role as enum ('admin', 'editor', 'agente');
exception when duplicate_object then null; end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  secretaria_id uuid references public.secretarias(id) on delete set null,
  role public.user_role not null default 'agente',
  created_at timestamptz not null default now()
);

-- ---------- FORMULÁRIOS ----------
create table if not exists public.forms (
  id uuid primary key default gen_random_uuid(),
  secretaria_id uuid references public.secretarias(id) on delete cascade,
  nome text not null,
  descricao text,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- PERGUNTAS ----------
create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.forms(id) on delete cascade,
  titulo text not null,
  tipo text not null check (tipo in ('texto','numero','data','opcao_unica','opcao_multipla','geoponto')),
  opcoes jsonb default '[]'::jsonb,
  obrigatoria boolean not null default true,
  ordem integer not null default 0,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- ENTREVISTAS (preenchimentos) ----------
create table if not exists public.entrevistas (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.forms(id) on delete cascade,
  agente_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'em_andamento' check (status in ('em_andamento','concluida')),
  latitude double precision,
  longitude double precision,
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- RESPOSTAS ----------
create table if not exists public.answers (
  id uuid primary key default gen_random_uuid(),
  entrevista_id uuid not null references public.entrevistas(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  valor jsonb,
  created_at timestamptz not null default now(),
  unique (entrevista_id, question_id)
);

-- ---------- TRIGGER: criar perfil ao criar usuário ----------
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role, secretaria_id)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'role', 'agente')::public.user_role,
    nullif(new.raw_user_meta_data ->> 'secretaria_id', '')::uuid
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- HELPER: roles ----------
create or replace function public.app_role()
returns public.user_role
language sql stable security definer set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.current_secretaria_id()
returns uuid
language sql stable security definer set search_path = public
as $$
  select secretaria_id from public.profiles where id = auth.uid();
$$;

-- Email do usuário (apenas admin)
create or replace function public.user_email(user_id uuid)
returns text
language sql stable security definer set search_path = auth
as $$
  select email
  from auth.users
  where id = user_id
    and public.app_role() = 'admin';
$$;

-- ============================================================
-- RLS
-- ============================================================
alter table public.secretarias enable row level security;
alter table public.profiles enable row level security;
alter table public.forms enable row level security;
alter table public.questions enable row level security;
alter table public.entrevistas enable row level security;
alter table public.answers enable row level security;

-- SECRETARIAS: leitura p/ autenticados, escrita p/ admin
create policy "secretarias_select_autenticado" on public.secretarias
  for select to authenticated using (true);
create policy "secretarias_write_admin" on public.secretarias
  for all to authenticated using (app_role() = 'admin') with check (app_role() = 'admin');

-- PROFILES: cada um vê o próprio; admin vê todos; editor vê da própria secretaria
create policy "profiles_select_proprio" on public.profiles
  for select to authenticated using (id = auth.uid());
create policy "profiles_select_admin" on public.profiles
  for select to authenticated using (app_role() = 'admin');
create policy "profiles_select_mesma_secretaria" on public.profiles
  for select to authenticated using (
    app_role() = 'editor' and secretaria_id = current_secretaria_id()
  );
create policy "profiles_update_proprio" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "profiles_write_admin" on public.profiles
  for all to authenticated using (app_role() = 'admin') with check (app_role() = 'admin');

-- FORMS: leitura p/ autenticados, escrita p/ admin
create policy "forms_select_autenticado" on public.forms
  for select to authenticated using (true);
create policy "forms_write_admin" on public.forms
  for all to authenticated using (app_role() = 'admin') with check (app_role() = 'admin');

-- QUESTIONS: leitura p/ autenticados (apenas forms ativos no dia-a-dia)
create policy "questions_select_autenticado" on public.questions
  for select to authenticated using (true);

-- escrita p/ editor (da própria secretaria) e admin
create policy "questions_write_admin" on public.questions
  for all to authenticated using (app_role() = 'admin') with check (app_role() = 'admin');
create policy "questions_write_editor" on public.questions
  for all to authenticated using (
    app_role() = 'editor'
    and exists (
      select 1 from public.forms f
      where f.id = form_id and f.secretaria_id = current_secretaria_id()
    )
  )
  with check (
    app_role() = 'editor'
    and exists (
      select 1 from public.forms f
      where f.id = form_id and f.secretaria_id = current_secretaria_id()
    )
  );

-- ENTREVISTAS: agente gerencia as próprias; editor/admin veem da secretaria
create policy "entrevistas_select_proprias" on public.entrevistas
  for select to authenticated using (agente_id = auth.uid());
create policy "entrevistas_insert_agente" on public.entrevistas
  for insert to authenticated with check (agente_id = auth.uid());
create policy "entrevistas_update_proprias" on public.entrevistas
  for update to authenticated using (agente_id = auth.uid()) with check (agente_id = auth.uid());
create policy "entrevistas_select_secretaria" on public.entrevistas
  for select to authenticated using (
    app_role() in ('editor', 'admin')
    and exists (
      select 1 from public.forms f
      where f.id = form_id
        and (app_role() = 'admin' or f.secretaria_id = current_secretaria_id())
    )
  );

-- ANSWERS: segue a entrevista
create policy "answers_select_proprias" on public.answers
  for select to authenticated using (
    exists (select 1 from public.entrevistas e where e.id = entrevista_id and e.agente_id = auth.uid())
    or (
      app_role() in ('editor', 'admin')
      and exists (
        select 1 from public.entrevistas e
        join public.forms f on f.id = e.form_id
        where e.id = entrevista_id
          and (app_role() = 'admin' or f.secretaria_id = current_secretaria_id())
      )
    )
  );
create policy "answers_insert_agente" on public.answers
  for insert to authenticated with check (
    exists (select 1 from public.entrevistas e where e.id = entrevista_id and e.agente_id = auth.uid())
  );
create policy "answers_update_agente" on public.answers
  for update to authenticated using (
    exists (select 1 from public.entrevistas e where e.id = entrevista_id and e.agente_id = auth.uid())
  ) with check (
    exists (select 1 from public.entrevistas e where e.id = entrevista_id and e.agente_id = auth.uid())
  );

-- ============================================================
-- SEED INICIAL
-- ============================================================
insert into public.secretarias (nome, sigla) values
  ('Secretaria de Desenvolvimento Social', 'SEDES'),
  ('Secretaria de Desenvolvimento Urbano e Habitação', 'SEDUH')
on conflict (sigla) do nothing;

insert into public.forms (secretaria_id, nome, descricao)
select s.id, s.nome, 'Formulário padrão da ' || s.nome
from public.secretarias s
where not exists (select 1 from public.forms f where f.secretaria_id = s.id);
