-- ============================================================
-- Vincular cidadão à entrevista + agentes podem cadastrar pessoas
-- ============================================================

-- Vínculo da entrevista com o cidadão
alter table public.entrevistas
  add column if not exists pessoa_id uuid references public.pessoas(id) on delete set null;

-- Agentes podem cadastrar novas pessoas no levantamento
drop policy if exists "pessoas_insert_agente" on public.pessoas;
create policy "pessoas_insert_agente" on public.pessoas
  for insert to authenticated with check (true);

-- Agentes podem editar pessoas que cadastraram (sem regra de dono: todos autenticados podem atualizar no fluxo)
drop policy if exists "pessoas_update_agente" on public.pessoas;
create policy "pessoas_update_agente" on public.pessoas
  for update to authenticated using (true) with check (true);

create index if not exists entrevistas_pessoa_id_idx on public.entrevistas (pessoa_id);
