-- ============================================================
-- 00013 — Perguntas pessoais passam para o cadastro do cidadão
--
-- Raça/cor, identidade de gênero e orientação sexual são
-- características estáveis da PESSOA, não da entrevista.
-- Passam a ser colunas de public.pessoas, preenchidas em
-- "Cadastrar nova pessoa" (app/entrevistas/nova), e as perguntas
-- repetidas nos formulários das secretarias são desativadas.
-- ============================================================

alter table public.pessoas
  add column if not exists raca_cor text,
  add column if not exists identidade_genero text,
  add column if not exists orientacao_sexual text;

-- Desativa as perguntas duplicadas em todos os formulários
-- (mantém o histórico de respostas antigas intacto)
update public.questions
set ativo = false
where titulo in ('Raça/cor', 'Identidade de gênero', 'Orientação sexual')
  and ativo = true;

-- View passa a ler raça/cor direto da pessoa
create or replace view public.v_painel_sedes with (security_invoker = true) as
with resp as (
  select
    a.entrevista_id,
    max(case when q.titulo = 'Pessoa com deficiência (PcD)?' then a.valor #>> '{}' end) as pcd,
    max(case when q.titulo = 'Aceitou orientações sobre programas e serviços?' then a.valor #>> '{}' end) as aceitou_orientacao,
    max(case when q.titulo = 'Foi encaminhado(a) ao acolhimento institucional?' then a.valor #>> '{}' end) as encaminhado_acolhimento
  from public.answers a
  join public.questions q on q.id = a.question_id
  where exists (
    select 1
    from public.forms f
    join public.secretarias s on s.id = f.secretaria_id
    where f.id = q.form_id and s.sigla = 'SEDES'
  )
  group by a.entrevista_id
)
select
  e.id                              as entrevista_id,
  e.created_at::date                as data_acao,
  p.ra                              as regiao_adm,
  p.nome                            as cidadao,
  p.sexo,
  case
    when p.idade < 12 then 'crianca'
    when p.idade < 18 then 'adolescente'
    when p.idade < 60 then 'adulto'
    else 'idoso'
  end                               as faixa_etaria,
  p.raca_cor,
  r.pcd,
  r.aceitou_orientacao,
  r.encaminhado_acolhimento
from public.entrevistas e
join public.pessoas p on p.id = e.pessoa_id
left join resp r on r.entrevista_id = e.id
where exists (
  select 1
  from public.forms f
  join public.secretarias s on s.id = f.secretaria_id
  where f.id = e.form_id and s.sigla = 'SEDES'
);
