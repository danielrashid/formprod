-- ============================================================
-- 00011 — Perguntas de campo para SES e SEDES
--
-- SES   : atributos individuais das pessoas abordadas (raça/cor,
--         identidade de gênero, orientação sexual, situação de
--         saúde, necessidades, encaminhamentos, tratamento).
--
-- SEDES : registro diário da "Ação Integrada de Acolhimento para
--         a População em Situação de Rua" (PAI 001/2024), conforme
--         planilhas/SEDES.xlsx — uma entrevista por ação/dia/RA,
--         com somatórios: pessoas encontradas, orientações
--         (aceitas/recusas) e encaminhamentos ao acolhimento.
--
-- Idempotente: pode ser executada mais de uma vez sem duplicar.
-- ============================================================

-- Garante a secretaria de Saúde (a seed inicial só cria SEDES e SEDUH)
insert into public.secretarias (nome, sigla)
values ('Secretaria de Estado de Saúde do Distrito Federal', 'SES')
on conflict (sigla) do nothing;

-- Garante um formulário padrão para a SES
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

  -- ------------------------------------------------------------
  -- Correção: estas perguntas são individuais e pertencem à SES.
  -- Remove qualquer versão que tenha sido anexada ao form SEDES.
  -- ------------------------------------------------------------
  delete from public.questions
  where form_id = v_form_sedes
    and titulo in (
      'Raça/cor',
      'Identidade de gênero',
      'Orientação sexual',
      'Acompanhado pela equipe do Consultório na Rua (eCR)?',
      'Situação de saúde referida ou observada',
      'Necessidades identificadas',
      'Encaminhamentos realizados',
      'Em tratamento?',
      'Serviço em que está em tratamento'
    );

  -- ------------------------------------------------------------
  -- Perguntas SES (individuais)
  -- ------------------------------------------------------------
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

  -- ------------------------------------------------------------
  -- Identifica o formulário SEDES pelo nome padrão da seed e dá
  -- um título claro à ação (não sobrescreve se já foi renomeado).
  -- ------------------------------------------------------------
  update public.forms
  set nome = 'Ação Integrada de Acolhimento — População em Situação de Rua',
      descricao = 'Registro diário por ação/RA: pessoas encontradas, orientações e encaminhamentos ao acolhimento (PAI 001/2024).'
  where id = v_form_sedes
    and nome = 'Secretaria de Desenvolvimento Social';

  -- ------------------------------------------------------------
  -- Perguntas SEDES (uma entrevista por ação/dia/RA)
  -- ------------------------------------------------------------
  insert into public.questions (form_id, titulo, tipo, opcoes, obrigatoria, ordem)
  select
    v_form_sedes,
    d.titulo,
    d.tipo,
    d.opcoes::jsonb,
    d.obrigatoria,
    coalesce((select max(q.ordem) from public.questions q where q.form_id = v_form_sedes), 0)
      + d.seq
  from (values
    (1, 'Data da ação', 'data', '[]'::jsonb, true),
    (2, 'Região Administrativa da ação', 'opcao_unica',
     '["Plano Piloto","Gama","Taguatinga","Brazlândia","Sobradinho","Planaltina","Paranoá","Núcleo Bandeirante","Ceilândia","Guará","Cruzeiro","Samambaia","Santa Maria","São Sebastião","Recanto das Emas","Lago Sul","Riacho Fundo","Lago Norte","Candangolândia","Park Way","Varjão","Águas Claras","Riacho Fundo II","SIA","Vicente Pires","Fercal","Sobradinho II","Jardim Botânico","Itapoã","Sudoeste / Octogonal","Arniqueira","Sol Nascente / Pôr do Sol"]'::jsonb,
     true),

    (3, 'Encontradas — Homens adultos', 'numero', '[]'::jsonb, false),
    (4, 'Encontradas — Mulheres adultas', 'numero', '[]'::jsonb, false),
    (5, 'Encontradas — Homens idosos', 'numero', '[]'::jsonb, false),
    (6, 'Encontradas — Mulheres idosas', 'numero', '[]'::jsonb, false),
    (7, 'Encontradas — Crianças (até 12 anos)', 'numero', '[]'::jsonb, false),
    (8, 'Encontradas — Adolescentes (12 a 17 anos)', 'numero', '[]'::jsonb, false),
    (9, 'Encontradas — Pessoas com deficiência (PcD)', 'numero', '[]'::jsonb, false),
    (10, 'Encontradas — Animais', 'numero', '[]'::jsonb, false),

    (11, 'Orientações sobre programas e serviços — Aceitaram', 'numero', '[]'::jsonb, false),
    (12, 'Orientações sobre programas e serviços — Recusaram', 'numero', '[]'::jsonb, false),

    (13, 'Encaminhadas ao acolhimento institucional — Homens adultos', 'numero', '[]'::jsonb, false),
    (14, 'Encaminhadas ao acolhimento institucional — Mulheres adultas', 'numero', '[]'::jsonb, false),
    (15, 'Encaminhadas ao acolhimento institucional — Homens idosos', 'numero', '[]'::jsonb, false),
    (16, 'Encaminhadas ao acolhimento institucional — Mulheres idosas', 'numero', '[]'::jsonb, false),
    (17, 'Encaminhadas ao acolhimento institucional — Crianças (até 12 anos)', 'numero', '[]'::jsonb, false),
    (18, 'Encaminhadas ao acolhimento institucional — Adolescentes (12 a 17 anos)', 'numero', '[]'::jsonb, false),
    (19, 'Encaminhadas ao acolhimento institucional — Pessoas com deficiência (PcD)', 'numero', '[]'::jsonb, false),
    (20, 'Encaminhadas ao acolhimento institucional — Animais', 'numero', '[]'::jsonb, false)
  ) as d(seq, titulo, tipo, opcoes, obrigatoria)
  where not exists (
    select 1 from public.questions q
    where q.form_id = v_form_sedes and q.titulo = d.titulo
  );
end
$$;
