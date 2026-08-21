-- ============================================================
-- 00011 — Formulário SEDES: atributos das abordagens à população
--         em situação de rua (Consultório na Rua)
--
-- Anexa ao formulário padrão da SEDES as perguntas correspondentes
-- às seções da planilha "Total de Abordagens a Pessoas em Situação
-- de Rua". Os totais da planilha NÃO viram perguntas: passam a ser
-- calculados por agregação sobre estas respostas individuais.
--
-- Idempotente: pode ser executada mais de uma vez sem duplicar.
-- ============================================================

do $$
declare
  v_form uuid;
begin
  select f.id into v_form
  from public.forms f
  join public.secretarias s on s.id = f.secretaria_id
  where s.sigla = 'SEDES'
  order by f.created_at asc
  limit 1;

  if v_form is null then
    raise exception 'Nenhum formulário encontrado para a secretaria SEDES';
  end if;

  insert into public.questions (form_id, titulo, tipo, opcoes, obrigatoria, ordem)
  select
    v_form,
    d.titulo,
    d.tipo,
    d.opcoes::jsonb,
    false,
    coalesce((select max(q.ordem) from public.questions q where q.form_id = v_form), 0)
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
    where q.form_id = v_form and q.titulo = d.titulo
  );
end
$$;
