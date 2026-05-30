-- =============================================================
-- 0008_invoices.sql
-- Notas fiscais. Geração automática de placeholders conforme o
-- modelo_emissao_nf do contrato (por_parcela ou encerramento).
-- =============================================================

create table public.invoices (
  id              uuid primary key default gen_random_uuid(),
  contract_id     uuid not null references public.contracts(id) on delete cascade,
  receivable_id   uuid references public.receivables(id) on delete set null,
  company_id      uuid not null references public.companies(id),
  numero_nf       text,
  data_emissao    date,
  valor           numeric(14,2) not null check (valor >= 0),
  status          public.invoice_status not null default 'nao_emitida',
  observacoes     text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index invoices_contract_idx    on public.invoices(contract_id);
create index invoices_receivable_idx  on public.invoices(receivable_id);
create index invoices_status_idx      on public.invoices(status);
create unique index invoices_receivable_unique
  on public.invoices(receivable_id) where receivable_id is not null;

create trigger invoices_updated_at
  before update on public.invoices
  for each row execute function public.tg_set_updated_at();

create trigger invoices_audit
  after insert or update or delete on public.invoices
  for each row execute function public.audit_trigger();

-- Geração automática de placeholders após o contrato ser inserido.
-- Para por_parcela: 1 placeholder por receivable (após generate_receivables).
-- Para encerramento: 1 placeholder único com o valor total.
create or replace function public.tg_contract_generate_invoices()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.modelo_emissao_nf = 'por_parcela' then
    insert into public.invoices (contract_id, receivable_id, company_id, valor, status)
    select r.contract_id, r.id, r.company_id, r.valor_previsto, 'nao_emitida'
      from public.receivables r
     where r.contract_id = new.id;
  else
    insert into public.invoices (contract_id, receivable_id, company_id, valor, status)
    values (new.id, null, new.company_id, new.valor_bruto, 'nao_emitida');
  end if;
  return new;
end;
$$;

-- Roda DEPOIS do trigger contracts_after_insert_generate (mesmo evento, ordem alfabética)
create trigger contracts_after_insert_invoices
  after insert on public.contracts
  for each row execute function public.tg_contract_generate_invoices();

alter table public.invoices enable row level security;

create policy "invoices_read"
  on public.invoices for select
  using (
    public.is_financeiro_or_admin()
    or contract_id in (
      select id from public.contracts
       where created_by = auth.uid()
          or vendedor_id in (select seller_id from public.profiles where id = auth.uid())
    )
  );

create policy "invoices_fin_write"
  on public.invoices for all
  using (public.is_financeiro_or_admin())
  with check (public.is_financeiro_or_admin());
