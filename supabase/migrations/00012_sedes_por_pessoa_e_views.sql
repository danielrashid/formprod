-- ============================================================
-- 00012 — Correção SEDES/SES: perguntas por pessoa + views
--
-- Modelo acordado: NENHUMA quantidade é preenchida em campo.
-- O agente registra cada pessoa abordada individualmente; os
-- totais da planilha ("Homens Adultos", "Mulheres Idosas",
-- "Encaminhadas ao acolhimento"...) saem das views no fim
-- deste arquivo, agregando sexo/idade (tabela pessoas) e as
-- respostas de atributo/desfecho.
--
--   "José, negro, 43 anos, foi encaminhado ao acolhimento"
--     -> sexo M + idade 43 => Homens Adultos
--     -> encaminhado = Sim => coluna de encaminhamento
--
-- Auto-suficiente e idempotente: roda em banco novo ou em um
-- onde a 00011 antiga já tenha sido aplicada.
-- ============================================================

-- ------------------------------------------------------------
-- Garante secretaria SES + formulário padrão
-- ------------------------------------------------------------
insert into public.secretarias (nome, sigla)
values ('Secretaria de Estado de Saúde do Distrito Federal', 'SES')
on conflict (sigla) do nothing;

insert into public.forms (secretaria_id, nome, descricao)
select s.id, s.nome, 'Formulário padrão da ' || s.nome
from public.secretarias s
where s.sigla = 'SES'
  and not exists (select 1 from public.forms f where f.secretaria_id = s.id);

do $$
declare
  v_form_ses uuid;
  v_form_sedes uuid;
begin
  select f.id into v_form_ses
  from public.forms f
  join public.secretarias s on s.id = f.secretaria_id
  where s.sigla = 'SES'
  order by f.created_at asc
  limit 1;

  select f.id into v_form_sedes
  from public.forms f
  join public.secretarias s on s.id = f.secretaria_id
  where s.sigla = 'SEDES'
  order by f.created_at asc
  limit 1;

  if v_form_ses is null then
    raise exception 'Nenhum formulário encontrado para a secretaria SES';
  end if;
  if v_form_sedes is null then
    raise exception 'Nenhum formulário encontrado para a secretaria SEDES';
  end if;

  -- ----------------------------------------------------------
  -- Limpeza defensiva no form SEDES:
  --   a) perguntas individuais que pertencem à SES
  --   b) perguntas de contagem numérica criadas pela 00011 antiga
  -- ----------------------------------------------------------
  delete from public.questions
  where form_id = v_form_sedes
    and (
      titulo in (
        'Raça/cor',
        'Identidade de gênero',
        'Orientação sexual',
        'Acompanhado pela equipe do Consultório na Rua (eCR)?',
        'Situação de saúde referida ou observada',
        'Necessidades identificadas',
        'Encaminhamentos realizados',
        'Em tratamento?',
        'Serviço em que está em tratamento',
        'Data da ação',
        'Região Administrativa da ação'
      )
      or titulo like 'Encontradas — %'
      or titulo like 'Encaminhadas ao acolhimento institucional — %'
      or titulo like 'Orientações sobre programas e serviços — %'
    );

  -- ----------------------------------------------------------
  -- Perguntas SES (individuais)
  -- ----------------------------------------------------------
  insert into public.questions (form_id, titulo, tipo, opcoes, obrigatoria, ordem)
  select
    v_form_ses,
    d.titulo,
    d.tipo,
    d.opcoes::jsonb,
    false,
    coalesce((select max(q.ordem) from public.questions q where q.form_id = v_form_ses), 0)
      + d.seq
  from (values
    (1, 'Raça/cor', 'opcao_unica',
     '["Preta","Parda","Branca","Amarela","Indígena","Não informou"]'),
    (2, 'Identidade de gênero', 'opcao_unica',
     '["Cisgênero","Mulher transgênero","Travesti","Homem transgênero","Não binário","Não soube informar"]'),
    (3, 'Orientação sexual', 'opcao_unica',
     '["Heterossexual","Homossexual","Bissexual","Assexual","Outra","Não soube informar"]'),
    (4, 'Acompanhado pela equipe do Consultório na Rua (eCR)?', 'opcao_unica',
     '["Sim","Não"]'),
    (5, 'Situação de saúde referida ou observada', 'opcao_multipla',
     '["Nenhuma referida","Doença crônica","Deficiência","Sofrimento psíquico / saúde mental","Uso abusivo de álcool","Uso de outras substâncias","Gestação","Outra"]'),
    (6, 'Necessidades identificadas', 'opcao_multipla',
     '["Documentação","Alimentação","Abrigo / acolhimento","Trabalho e renda","Saúde","Banho e higiene","Transporte","Benefício previdenciário (BPC)","Outra"]'),
    (7, 'Encaminhamentos realizados', 'opcao_multipla',
     '["CRAS","CREAS","CAPS","Abrigo institucional","Hospital / urgência","Centro de referência de documentação","Nenhum","Outro"]'),
    (8, 'Em tratamento?', 'opcao_unica',
     '["Sim","Não"]'),
    (9, 'Serviço em que está em tratamento', 'texto', '[]')
  ) as d(seq, titulo, tipo, opcoes)
  where not exists (
    select 1 from public.questions q
    where q.form_id = v_form_ses and q.titulo = d.titulo
  );

  -- ----------------------------------------------------------
  -- Título claro para o formulário SEDES (se ainda for o padrão)
  -- ----------------------------------------------------------
  update public.forms
  set nome = 'Ação Integrada de Acolhimento — População em Situação de Rua',
      descricao = 'Registro individual das pessoas abordadas na ação (PAI 001/2024). Totais por dia/RA são gerados automaticamente.'
  where id = v_form_sedes
    and nome = 'Secretaria de Desenvolvimento Social';

  -- ----------------------------------------------------------
  -- Perguntas SEDES — apenas atributo/desfecho da pessoa.
  -- Sexo, idade, data e RA já vêm do cadastro da pessoa e da
  -- entrevista (pessoas.sexo, pessoas.idade, pessoas.ra,
  -- entrevistas.created_at).
  -- ----------------------------------------------------------
  insert into public.questions (form_id, titulo, tipo, opcoes, obrigatoria, ordem)
  select
    v_form_sedes,
    d.titulo,
    d.tipo,
    d.opcoes::jsonb,
    false,
    coalesce((select max(q.ordem) from public.questions q where q.form_id = v_form_sedes), 0)
      + d.seq
  from (values
    (1, 'Raça/cor', 'opcao_unica',
     '["Preta","Parda","Branca","Amarela","Indígena","Não informou"]'),
    (2, 'Pessoa com deficiência (PcD)?', 'opcao_unica', '["Sim","Não"]'),
    (3, 'Aceitou orientações sobre programas e serviços?', 'opcao_unica', '["Sim","Não"]'),
    (4, 'Foi encaminhado(a) ao acolhimento institucional?', 'opcao_unica', '["Sim","Não"]')
  ) as d(seq, titulo, tipo, opcoes)
  where not exists (
    select 1 from public.questions q
    where q.form_id = v_form_sedes and q.titulo = d.titulo
  );
end
$$;

-- ============================================================
-- VIEWS
-- ============================================================

-- Uma linha por pessoa abordada (form SEDES), com faixa etária e
-- desfechos — base flexível para painéis (ArcGIS/BI).
create or replace view public.v_painel_sedes with (security_invoker = true) as
with resp as (
  select
    a.entrevista_id,
    max(case when q.titulo = 'Raça/cor' then a.valor #>> '{}' end)          as raca_cor,
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
  r.raca_cor,
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

-- Layout da planilha: uma linha por dia/RA com os somatórios.
-- Obs.: a coluna "Animais" não é derivável de registros individuais
-- (não há cadastro de animais); se precisar dela, vira pergunta à parte.
create or replace view public.v_sedes_planilha_diaria with (security_invoker = true) as
select
  data_acao,
  regiao_adm,
  count(*) filter (where sexo = 'M' and faixa_etaria = 'adulto')      as homens_adultos,
  count(*) filter (where sexo = 'F' and faixa_etaria = 'adulto')      as mulheres_adultas,
  count(*) filter (where sexo = 'M' and faixa_etaria = 'idoso')       as homens_idosos,
  count(*) filter (where sexo = 'F' and faixa_etaria = 'idoso')       as mulheres_idosas,
  count(*) filter (where faixa_etaria = 'crianca')                    as criancas_ate_12,
  count(*) filter (where faixa_etaria = 'adolescente')                as adolescentes_12_17,
  count(*) filter (where pcd = 'Sim')                                 as pessoas_com_deficiencia,
  count(*) filter (where aceitou_orientacao = 'Sim')                  as orientacoes_aceitas,
  count(*) filter (where aceitou_orientacao = 'Não')                  as orientacoes_recusadas,
  count(*) filter (where encaminhado_acolhimento = 'Sim' and sexo = 'M' and faixa_etaria = 'adulto') as enc_homens_adultos,
  count(*) filter (where encaminhado_acolhimento = 'Sim' and sexo = 'F' and faixa_etaria = 'adulto') as enc_mulheres_adultas,
  count(*) filter (where encaminhado_acolhimento = 'Sim' and sexo = 'M' and faixa_etaria = 'idoso')  as enc_homens_idosos,
  count(*) filter (where encaminhado_acolhimento = 'Sim' and sexo = 'F' and faixa_etaria = 'idoso')  as enc_mulheres_idosas,
  count(*) filter (where encaminhado_acolhimento = 'Sim' and faixa_etaria = 'crianca')               as enc_criancas_ate_12,
  count(*) filter (where encaminhado_acolhimento = 'Sim' and faixa_etaria = 'adolescente')           as enc_adolescentes_12_17,
  count(*) filter (where encaminhado_acolhimento = 'Sim' and pcd = 'Sim')                            as enc_pcd
from public.v_painel_sedes
group by data_acao, regiao_adm;
