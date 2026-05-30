-- =============================================================
-- 0006_contracts.sql
-- Contratos (vendas). Snapshot do percentual de imposto vigente
-- garante que alterações futuras não afetem contratos existentes.
-- =============================================================

create table public.contracts (
  id                            uuid primary key default gen_random_uuid(),
  company_id                    uuid not null references public.companies(id) on delete restrict,
  vendedor_id                   uuid not null references public.sellers(id) on delete restrict,
  servico                       text not null,
  valor_bruto                   numeric(14,2) not null check (valor_bruto >= 0),
  percentual_imposto_snapshot   numeric(5,2)  not null check (percentual_imposto_snapshot >= 0),
  valor_imposto                 numeric(14,2) not null,
  valor_liquido                 numeric(14,2) not null,
  data_venda                    date not null default current_date,
  data_inicio                   date,
  data_conclusao_prevista       date,
  data_conclusao_real           date,
  status                        public.contract_status not null default 'em_andamento',
  forma_pagamento               public.payment_form not null,
  parcelas_personalizadas       jsonb, -- usado quando forma_pagamento = 'personalizado'
  modelo_emissao_nf             public.invoice_emission not null default 'por_parcela',
  observacoes                   text,
  created_by                    uuid references public.profiles(id),
  created_at                    timestamptz not null default now(),
  updated_at                    timestamptz not null default now()
);

create index contracts_company_idx  on public.contracts(company_id);
create index contracts_vendedor_idx on public.contracts(vendedor_id);
create index contracts_status_idx   on public.contracts(status);
create index contracts_data_venda_idx on public.contracts(data_venda);

create trigger contracts_updated_at
  before update on public.contracts
  for each row execute function public.tg_set_updated_at();

create trigger contracts_audit
  after insert or update or delete on public.contracts
  for each row execute function public.audit_trigger();

-- Coerência aritmética (valor_imposto e valor_liquido)
create or replace function public.tg_contract_compute_values()
returns trigger language plpgsql as $$
begin
  -- Snapshot do imposto: se não veio, usa o vigente
  if new.percentual_imposto_snapshot is null then
    new.percentual_imposto_snapshot := coalesce(public.current_tax_percentual(), 0);
  end if;
  new.valor_imposto := round((new.valor_bruto * new.percentual_imposto_snapshot / 100)::numeric, 2);
  new.valor_liquido := round((new.valor_bruto - new.valor_imposto)::numeric, 2);
  return new;
end;
$$;

create trigger contracts_compute_values
  before insert or update of valor_bruto, percentual_imposto_snapshot on public.contracts
  for each row execute function public.tg_contract_compute_values();

alter table public.contracts enable row level security;

create policy "contracts_read"
  on public.contracts for select
  using (
    public.is_financeiro_or_admin()
    or created_by = auth.uid()
    or vendedor_id in (select seller_id from public.profiles where id = auth.uid())
  );

create policy "contracts_insert"
  on public.contracts for insert
  with check (
    public.current_user_role() in ('admin','comercial')
    and created_by = auth.uid()
  );

create policy "contracts_update"
  on public.contracts for update
  using (public.is_admin() or created_by = auth.uid())
  with check (public.is_admin() or created_by = auth.uid());

create policy "contracts_delete"
  on public.contracts for delete
  using (public.is_admin());
