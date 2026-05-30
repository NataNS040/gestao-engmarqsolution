-- =============================================================
-- 0009_payables.sql
-- Contas a pagar (despesas), com categorias.
-- =============================================================

create table public.payables (
  id                    uuid primary key default gen_random_uuid(),
  descricao             text not null,
  categoria_id          bigint references public.financial_categories(id),
  fornecedor            text,
  valor                 numeric(14,2) not null check (valor >= 0),
  data_vencimento       date not null,
  data_pagamento        date,
  forma_pagamento       text,
  status                public.payable_status not null default 'pendente',
  observacoes           text,
  commission_payment_id uuid, -- FK adicionada em 0010 (commissions)
  created_by            uuid references public.profiles(id),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index payables_status_idx        on public.payables(status);
create index payables_vencimento_idx    on public.payables(data_vencimento);
create index payables_categoria_idx     on public.payables(categoria_id);

create trigger payables_updated_at
  before update on public.payables
  for each row execute function public.tg_set_updated_at();

create trigger payables_audit
  after insert or update or delete on public.payables
  for each row execute function public.audit_trigger();

-- Marca pagos automaticamente se data_pagamento for setada
create or replace function public.tg_payable_status_from_payment()
returns trigger language plpgsql as $$
begin
  if new.data_pagamento is not null then
    new.status := 'pago';
  elsif new.data_vencimento < current_date and (new.status is null or new.status = 'pendente') then
    new.status := 'vencido';
  end if;
  return new;
end;
$$;

create trigger payables_compute_status
  before insert or update on public.payables
  for each row execute function public.tg_payable_status_from_payment();

create or replace function public.mark_overdue_payables()
returns integer language plpgsql security definer set search_path = public as $$
declare v_count integer;
begin
  update public.payables
     set status = 'vencido'
   where status = 'pendente'
     and data_vencimento < current_date;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

alter table public.payables enable row level security;

create policy "payables_read"   on public.payables for select using (public.is_financeiro_or_admin());
create policy "payables_write"  on public.payables for all
  using (public.is_financeiro_or_admin())
  with check (public.is_financeiro_or_admin());
