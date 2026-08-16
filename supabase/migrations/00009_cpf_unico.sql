-- ============================================================
-- Trava de duplicidade de CPF em pessoas
-- ============================================================

-- Impede que dois cidadãos tenham o mesmo CPF (CPF null continua permitido)
create unique index if not exists pessoas_cpf_unique_idx on public.pessoas (cpf) where cpf is not null;
