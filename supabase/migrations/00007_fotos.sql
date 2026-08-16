-- ============================================================
-- Fotos: foto do cidadão (pessoas.foto_url), tipo de pergunta
-- "foto" e bucket de storage para as imagens
-- ============================================================

-- Foto do cidadão no mapa
alter table public.pessoas
  add column if not exists foto_url text;

-- Permite o tipo de pergunta "foto"
alter table public.questions drop constraint if exists questions_tipo_check;
alter table public.questions
  add constraint questions_tipo_check check (
    tipo in ('texto','numero','data','opcao_unica','opcao_multipla','geoponto','foto')
  );

-- Bucket público para as fotos do levantamento
insert into storage.buckets (id, name, public)
values ('fotos', 'fotos', true)
on conflict (id) do nothing;

-- Políticas: autenticados podem subir/ver/excluir fotos do levantamento
create policy "fotos_insert_autenticado" on storage.objects
  for insert to authenticated with check (bucket_id = 'fotos');

create policy "fotos_select_autenticado" on storage.objects
  for select to authenticated using (bucket_id = 'fotos');

create policy "fotos_delete_autenticado" on storage.objects
  for delete to authenticated using (bucket_id = 'fotos');
