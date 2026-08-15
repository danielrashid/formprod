-- ============================================================
-- Pessoas cadastradas no levantamento (fictícias p/ teste)
-- ============================================================

create table if not exists public.pessoas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cpf text,
  idade integer,
  sexo text check (sexo in ('M', 'F', 'Outro')),
  quer_voltar_estado text check (quer_voltar_estado in ('sim', 'nao', 'nao_sabe')),
  estado_origem text,
  tem_doenca boolean not null default false,
  doenca text,
  ra text,
  latitude double precision not null,
  longitude double precision not null,
  observacoes text,
  created_at timestamptz not null default now()
);

alter table public.pessoas enable row level security;

create policy "pessoas_select_autenticado" on public.pessoas
  for select to authenticated using (true);

create policy "pessoas_write_admin" on public.pessoas
  for all to authenticated using (app_role() = 'admin') with check (app_role() = 'admin');

-- ---------- SEED: 10 pessoas fictícias no DF ----------
insert into public.pessoas (nome, cpf, idade, sexo, quer_voltar_estado, estado_origem, tem_doenca, doenca, ra, latitude, longitude, observacoes) values
  ('Maria das Graças Silva',      '123.456.789-01', 54, 'F', 'sim',      'Piauí',     true,  'Hipertensão',              'Ceilândia',          -15.8177, -48.1264, 'Em situação de rua próxima à via N1. Família no Piauí.'),
  ('José Antônio Pereira',        '234.567.890-12', 61, 'M', 'sim',      'Bahia',     true,  'Diabetes tipo 2',          'Taguatinga',         -15.8050, -48.0554, 'Deseja retorno assistido. Acompanhado pela rede.'),
  ('Antônio Carlos Souza',        '345.678.901-23', 38, 'M', 'nao',      'Ceará',     false, null,                       'Plano Piloto',       -15.8267, -47.9218, 'Trabalha com reciclagem na Asa Sul.'),
  ('Francisca Alves da Silva',    '456.789.012-34', 47, 'F', 'sim',      'Maranhão',  false, null,                       'Samambaia',          -15.8808, -48.1049, 'Tem filhos no Maranhão, quer retorno.'),
  ('Roberto Ferreira Lima',       '567.890.123-45', 29, 'M', 'nao_sabe', 'Goiás',     false, null,                       'Guará',              -15.8305, -47.9879, 'Chegou recentemente ao DF, indefinido quanto a retorno.'),
  ('Luzia Pereira dos Santos',    '678.901.234-56', 72, 'F', 'sim',      'Goiás',     true,  'Hipertensão e cardiopatia', 'Gama',               -16.0136, -48.0658, 'Idosa, necessita de acompanhamento médico.'),
  ('Carlos Eduardo Nascimento',   '789.012.345-67', 33, 'M', 'nao',      'Minas Gerais', true, 'Transtorno mental',     'Planaltina',         -15.6176, -47.6542, 'Em tratamento psiquiátrico, acompanhado pela SEDES.'),
  ('Ana Paula Rodrigues',         '890.123.456-78', 41, 'F', 'sim',      'Tocantins', false, null,                       'Sobradinho',         -15.6460, -47.7869, 'Quer retornar ao Tocantins, já iniciou contato com a família.'),
  ('João Batista Mendes',         '901.234.567-89', 58, 'M', 'sim',      'Minas Gerais', true, 'HIV em tratamento',    'Recanto das Emas',   -15.9024, -48.0600, 'Faz acompanhamento no Centro de Saúde.'),
  ('Rafael Moreira Campos',       '012.345.678-90', 26, 'M', 'nao_sabe', 'Bahia',     false, null,                       'Águas Claras',       -15.8458, -48.0211, 'Jovem, avalia possibilidade de reinserção no mercado.')
on conflict do nothing;
