-- ============================================================
-- Mapa: visibilidade de entrevistas por cidadão
-- - Todos os agentes veem entrevistas concluídas de qualquer cidadão
-- - Nome do agente e entrevistas em andamento: só para admin/editor ou o próprio autor
-- ============================================================

-- Detalhe das entrevistas de um cidadão (com ocultação por perfil)
create or replace function public.entrevistas_do_cidadao(cidadao_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
declare
  viewer uuid := auth.uid();
  eh_admin_editor boolean;
  out jsonb;
begin
  select (app_role() in ('admin', 'editor')) into eh_admin_editor;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', e.id,
      'status', e.status,
      'created_at', e.created_at,
      'agente_nome', case
        when eh_admin_editor or e.agente_id = viewer then p.full_name
        else null
      end,
      'respostas', case
        when eh_admin_editor or e.agente_id = viewer or e.status = 'concluida' then (
          select coalesce(jsonb_agg(
            jsonb_build_object('pergunta', q.titulo, 'valor', a.valor)
            order by q.ordem
          ), '[]'::jsonb)
          from public.answers a
          join public.questions q on q.id = a.question_id
          where a.entrevista_id = e.id
        )
        else '[]'::jsonb
      end
    ) order by e.created_at desc
  ), '[]'::jsonb) into out
  from public.entrevistas e
  join public.profiles p on p.id = e.agente_id
  where e.pessoa_id = cidadao_id
    and (eh_admin_editor or e.agente_id = viewer or e.status = 'concluida');

  return out;
end;
$$;

-- Contagem de entrevistas concluídas por cidadão (p/ indicador no mapa)
create or replace function public.contagem_entrevistas_cidadaos()
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
declare
  out jsonb;
begin
  select coalesce(jsonb_object_agg(pessoa_id, concluidas), '{}'::jsonb) into out
  from (
    select pessoa_id, count(*) filter (where e.status = 'concluida') as concluidas
    from public.entrevistas e
    where e.pessoa_id is not null
    group by pessoa_id
  ) t;

  return out;
end;
$$;
