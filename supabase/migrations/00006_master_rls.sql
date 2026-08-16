-- ============================================================
-- Admin master: admin da secretaria DF-Legal OU admin sem secretaria (global) vê todas
-- ============================================================

create or replace function public.is_master()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    left join public.secretarias s on s.id = p.secretaria_id
    where p.id = auth.uid()
      and p.role = 'admin'
      and (p.secretaria_id is null or upper(s.sigla) = 'DF-LEGAL')
  );
$$;

-- ENTREVISTAS: admin/editor veem da própria secretaria; master vê todas
drop policy if exists "entrevistas_select_secretaria" on public.entrevistas;
create policy "entrevistas_select_secretaria" on public.entrevistas
  for select to authenticated using (
    app_role() in ('editor', 'admin')
    and exists (
      select 1 from public.forms f
      where f.id = form_id
        and (public.is_master() or f.secretaria_id = current_secretaria_id())
    )
  );

-- ANSWERS: segue a entrevista
drop policy if exists "answers_select_proprias" on public.answers;
create policy "answers_select_proprias" on public.answers
  for select to authenticated using (
    exists (select 1 from public.entrevistas e where e.id = entrevista_id and e.agente_id = auth.uid())
    or (
      app_role() in ('editor', 'admin')
      and exists (
        select 1 from public.entrevistas e
        join public.forms f on f.id = e.form_id
        where e.id = entrevista_id
          and (public.is_master() or f.secretaria_id = current_secretaria_id())
      )
    )
  );
