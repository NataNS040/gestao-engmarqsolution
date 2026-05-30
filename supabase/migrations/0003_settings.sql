-- =============================================================
-- 0003_settings.sql
-- Configurações financeiras: impostos (histórico) e
-- faixas de comissão (configuráveis).
-- =============================================================

create table public.tax_settings (
  id                bigserial primary key,
  percentual        numeric(5,2) not null check (percentual >= 0 and percentual <= 100),
  vigencia_inicio   date not null,
  vigencia_fim      date,
  created_by        uuid references public.profiles(id),
  criado_em         timestamptz not null default now()
);

create index tax_settings_vigencia_idx on public.tax_settings(vigencia_inicio, vigencia_fim);

-- Garante apenas uma vigência ativa (vigencia_fim is null) por vez.
create unique index tax_settings_active_uniq
  on public.tax_settings ((vigencia_fim is null))
  where vigencia_fim is null;

-- Antes de inserir nova vigência, fecha a anterior automaticamente.
create or replace function public.tg_tax_close_previous()
returns trigger language plpgsql as $$
begin
  if new.vigencia_fim is null then
    update public.tax_settings
       set vigencia_fim = new.vigencia_inicio - interval '1 day'
     where vigencia_fim is null
       and id <> new.id;
  end if;
  return new;
end;
$$;

create trigger tax_settings_close_previous
  before insert on public.tax_settings
  for each row execute function public.tg_tax_close_previous();

create or replace function public.current_tax_percentual()
returns numeric language sql stable as $$
  select percentual from public.tax_settings
   where vigencia_fim is null
   order by vigencia_inicio desc
   limit 1;
$$;

alter table public.tax_settings enable row level security;

create policy "tax_settings_read_all"   on public.tax_settings for select using (auth.uid() is not null);
create policy "tax_settings_admin_write" on public.tax_settings for all
  using (public.is_admin()) with check (public.is_admin());

create trigger tax_settings_audit
  after insert or update or delete on public.tax_settings
  for each row execute function public.audit_trigger();

-- -------------------------------------------------------------
-- Faixas de comissão (progressivas, configuráveis com histórico)
-- -------------------------------------------------------------
create table public.commission_tiers (
  id                bigserial primary key,
  faixa             smallint not null,        -- 1, 2, 3, ...
  valor_minimo      numeric(14,2) not null,
  valor_maximo      numeric(14,2),            -- null = sem teto
  percentual        numeric(5,2) not null check (percentual >= 0 and percentual <= 100),
  vigencia_inicio   date not null,
  vigencia_fim      date,
  criado_em         timestamptz not null default now()
);

create index commission_tiers_vigencia_idx on public.commission_tiers(vigencia_inicio, vigencia_fim);

alter table public.commission_tiers enable row level security;

create policy "commission_tiers_read_all"   on public.commission_tiers for select using (auth.uid() is not null);
create policy "commission_tiers_admin_write" on public.commission_tiers for all
  using (public.is_admin()) with check (public.is_admin());

create trigger commission_tiers_audit
  after insert or update or delete on public.commission_tiers
  for each row execute function public.audit_trigger();

-- -------------------------------------------------------------
-- Categorias financeiras (despesas/receitas)
-- -------------------------------------------------------------
create table public.financial_categories (
  id        bigserial primary key,
  nome      text not null unique,
  tipo      text not null check (tipo in ('despesa', 'receita')),
  padrao    boolean not null default false,
  criado_em timestamptz not null default now()
);

alter table public.financial_categories enable row level security;

create policy "financial_categories_read_all" on public.financial_categories for select using (auth.uid() is not null);
create policy "financial_categories_admin_write" on public.financial_categories for all
  using (public.is_admin()) with check (public.is_admin());
