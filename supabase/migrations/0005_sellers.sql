-- =============================================================
-- 0005_sellers.sql
-- Cadastro de vendedores. Pode ser vinculado a um profile
-- 'comercial' para permitir o vendedor consultar suas próprias
-- vendas/comissões via RLS.
-- =============================================================

create table public.sellers (
  id                  uuid primary key default gen_random_uuid(),
  nome                text not null,
  email               text,
  telefone            text,
  percentual_padrao   numeric(5,2) check (percentual_padrao is null or (percentual_padrao >= 0 and percentual_padrao <= 100)),
  status              text not null default 'ativo' check (status in ('ativo','inativo')),
  profile_id          uuid unique references public.profiles(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index sellers_status_idx on public.sellers(status);

create trigger sellers_updated_at
  before update on public.sellers
  for each row execute function public.tg_set_updated_at();

create trigger sellers_audit
  after insert or update or delete on public.sellers
  for each row execute function public.audit_trigger();

-- FK pendente em profiles.seller_id (criada agora que sellers existe)
alter table public.profiles
  add constraint profiles_seller_id_fkey
  foreign key (seller_id) references public.sellers(id) on delete set null;

alter table public.sellers enable row level security;

create policy "sellers_read_all"
  on public.sellers for select
  using (auth.uid() is not null);

create policy "sellers_admin_write"
  on public.sellers for all
  using (public.is_admin())
  with check (public.is_admin());
