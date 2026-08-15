-- ============================================================
-- Login por CPF: retorna o e-mail do usuário a partir do CPF
-- ============================================================

create or replace function public.user_email_by_cpf(p_cpf text)
returns text
language sql stable security definer set search_path = public
as $$
  select u.email
  from auth.users u
  join public.profiles p on p.id = u.id
  where regexp_replace(p.cpf, '[^0-9]', '', 'g') = regexp_replace(p_cpf, '[^0-9]', '', 'g')
  limit 1;
$$;

-- Normalizar CPF/telefone existentes (manter somente dígitos)
update public.profiles
set cpf = regexp_replace(cpf, '[^0-9]', '', 'g')
where cpf is not null;

update public.profiles
set telefone = regexp_replace(telefone, '[^0-9]', '', 'g')
where telefone is not null;

-- Normalizar CPFs da tabela pessoas
update public.pessoas
set cpf = regexp_replace(cpf, '[^0-9]', '', 'g')
where cpf is not null;

-- CPF de teste para o usuário admin (trocar pelo CPF real depois)
update public.profiles
set cpf = '00000000191'
where id = (select id from auth.users where email = 'admin@teste.gov.br')
  and (cpf is null or cpf = '');
