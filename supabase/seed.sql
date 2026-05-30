-- =============================================================
-- 0099_seed.sql
-- Dados iniciais idempotentes (re-rodáveis após `db reset`).
-- Pode ser movido para supabase/seed.sql se preferir.
-- =============================================================

-- Imposto padrão inicial: 6% vigente a partir de hoje
insert into public.tax_settings (percentual, vigencia_inicio)
select 6.00, current_date
where not exists (select 1 from public.tax_settings);

-- Faixas de comissão progressivas (especificação do projeto)
insert into public.commission_tiers (faixa, valor_minimo, valor_maximo, percentual, vigencia_inicio)
select 1, 0,        30000,  8.00, current_date
where not exists (select 1 from public.commission_tiers);

insert into public.commission_tiers (faixa, valor_minimo, valor_maximo, percentual, vigencia_inicio)
select 2, 30000,    45000,  9.00, current_date
where not exists (select 1 from public.commission_tiers where faixa = 2);

insert into public.commission_tiers (faixa, valor_minimo, valor_maximo, percentual, vigencia_inicio)
select 3, 45000,    null,   10.00, current_date
where not exists (select 1 from public.commission_tiers where faixa = 3);

-- Categorias padrão (espec.)
insert into public.financial_categories (nome, tipo, padrao) values
  ('Impostos',        'despesa', true),
  ('Comissões',       'despesa', true),
  ('Funcionários',    'despesa', true),
  ('Marketing',       'despesa', true),
  ('Sistemas',        'despesa', true),
  ('Operacional',     'despesa', true),
  ('Administrativo',  'despesa', true),
  ('Outros',          'despesa', true)
on conflict (nome) do nothing;
