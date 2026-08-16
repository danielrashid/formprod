-- ============================================================
-- Permitir que o agente remova as próprias entrevistas não concluídas
-- (usado ao clicar em "Voltar" sem salvar)
-- ============================================================

create policy "entrevistas_delete_proprias" on public.entrevistas
  for delete to authenticated using (
    agente_id = auth.uid() and status <> 'concluida'
  );
