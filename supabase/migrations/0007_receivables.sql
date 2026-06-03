-- =============================================================
-- 0007_receivables.sql
-- Contas a receber (parcelas) + recebimentos parciais.
-- Geração automática conforme forma_pagamento do contrato.
-- =============================================================

create table public.receivables (
  id                uuid primary key default gen_random_uuid(),
  contract_id       uuid not null references public.contracts(id) on delete cascade,
  company_id        uuid not null references public.companies(id),
  numero_parcela    smallint not null,
  total_parcelas    smallint not null,
  valor_previsto    numeric(14,2) not null check (valor_previsto >= 0),
  valor_recebido    numeric(14,2) not null default 0 check (valor_recebido >= 0),
  data_prevista     date not null,
  data_recebimento  date,
  status            public.receivable_status not null default 'pendente',
  observacoes       text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (contract_id, numero_parcela)
);

create index receivables_contract_idx     on public.receivables(contract_id);
create index receivables_company_idx      on public.receivables(company_id);
create index receivables_status_idx       on public.receivables(status);
create index receivables_data_prevista_idx on public.receivables(data_prevista);

create trigger receivables_updated_at
  before update on public.receivables
  for each row execute function public.tg_set_updated_at();

create trigger receivables_audit
  after insert or update or delete on public.receivables
  for each row execute function public.audit_trigger();

-- Recebimentos parciais (histórico)
create table public.receivable_payments (
  id                uuid primary key default gen_random_uuid(),
  receivable_id     uuid not null references public.receivables(id) on delete cascade,
  valor             numeric(14,2) not null check (valor > 0),
  data              date not null default current_date,
  forma_pagamento   text,
  registrado_por    uuid references public.profiles(id),
  observacoes       text,
  created_at        timestamptz not null default now()
);

create index receivable_payments_receivable_idx on public.receivable_payments(receivable_id);

create trigger receivable_payments_audit
  after insert or update or delete on public.receivable_payments
  for each row execute function public.audit_trigger();

-- Recalcula receivable agregado quando há pagamento
create or replace function public.tg_recompute_receivable()
returns trigger language plpgsql as $$
declare
  v_rid    uuid := coalesce(new.receivable_id, old.receivable_id);
  v_total  numeric(14,2);
  v_prev   numeric(14,2);
  v_last   date;
  v_status public.receivable_status;
begin
  select coalesce(sum(valor),0), max(data)
    into v_total, v_last
    from public.receivable_payments
   where receivable_id = v_rid;

  select valor_previsto into v_prev from public.receivables where id = v_rid;

  if v_total <= 0 then
    v_status := case when (select data_prevista from public.receivables where id = v_rid) < current_date
                     then 'vencido'::public.receivable_status
                     else 'pendente'::public.receivable_status end;
  elsif v_total >= v_prev then
    v_status := 'pago';
  else
    v_status := 'parcial';
  end if;

  update public.receivables
     set valor_recebido   = v_total,
         data_recebimento = case when v_total > 0 then v_last else null end,
         status           = v_status
   where id = v_rid;

  return coalesce(new, old);
end;
$$;

create trigger receivable_payments_recompute
  after insert or update or delete on public.receivable_payments
  for each row execute function public.tg_recompute_receivable();

-- Job-like: marca pendentes como vencidos (executar por cron ou
-- manualmente; uma view também serve, mas mantemos coluna persistida).
create or replace function public.mark_overdue_receivables()
returns integer language plpgsql security definer set search_path = public as $$
declare
  v_count integer;
begin
  update public.receivables
     set status = 'vencido'
   where status = 'pendente'
     and data_prevista < current_date;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- -------------------------------------------------------------
-- RPC: gera parcelas a partir do contrato
-- -------------------------------------------------------------
create or replace function public.generate_receivables(p_contract_id uuid)
returns integer language plpgsql security definer set search_path = public as $$
declare
  c              public.contracts%rowtype;
  v_total        integer;
  v_valor        numeric(14,2);
  v_resto        numeric(14,2);
  v_base_date    date;
  v_item         jsonb;
  v_idx          integer;
  v_arr_len      integer;
  v_inserted     integer := 0;
begin
  select * into c from public.contracts where id = p_contract_id;
  if not found then raise exception 'Contrato não encontrado'; end if;

  -- não duplica
  if exists (select 1 from public.receivables where contract_id = p_contract_id) then
    return 0;
  end if;

  v_base_date := coalesce(c.data_inicio, c.data_venda);

  if c.forma_pagamento = 'a_vista' then
    insert into public.receivables
      (contract_id, company_id, numero_parcela, total_parcelas, valor_previsto, data_prevista)
    values (c.id, c.company_id, 1, 1, c.valor_bruto, v_base_date);
    return 1;

  elsif c.forma_pagamento = '50_50' then
    v_valor := round(c.valor_bruto / 2, 2);
    v_resto := c.valor_bruto - v_valor;
    insert into public.receivables values
      (gen_random_uuid(), c.id, c.company_id, 1, 2, v_valor, 0, v_base_date, null, 'pendente', null, now(), now()),
      (gen_random_uuid(), c.id, c.company_id, 2, 2, v_resto, 0, v_base_date + interval '30 day', null, 'pendente', null, now(), now());
    return 2;

  elsif c.forma_pagamento in ('2x','3x','12x') then
    v_total := case c.forma_pagamento when '2x' then 2 when '3x' then 3 when '12x' then 12 end;
    v_valor := round(c.valor_bruto / v_total, 2);
    v_resto := c.valor_bruto - v_valor * (v_total - 1); -- última parcela absorve diferença
    for v_idx in 1..v_total loop
      insert into public.receivables
        (contract_id, company_id, numero_parcela, total_parcelas, valor_previsto, data_prevista)
      values (
        c.id, c.company_id, v_idx, v_total,
        case when v_idx = v_total then v_resto else v_valor end,
        v_base_date + ((v_idx - 1) * interval '30 day')
      );
      v_inserted := v_inserted + 1;
    end loop;
    return v_inserted;

  elsif c.forma_pagamento = 'personalizado' then
    if c.parcelas_personalizadas is null
       or jsonb_typeof(c.parcelas_personalizadas) <> 'array' then
      raise exception 'parcelas_personalizadas deve ser um array JSON [{valor, data}]';
    end if;
    v_arr_len := jsonb_array_length(c.parcelas_personalizadas);
    for v_idx in 0..v_arr_len-1 loop
      v_item := c.parcelas_personalizadas->v_idx;
      insert into public.receivables
        (contract_id, company_id, numero_parcela, total_parcelas, valor_previsto, data_prevista)
      values (
        c.id, c.company_id, v_idx + 1, v_arr_len,
        (v_item->>'valor')::numeric,
        (v_item->>'data')::date
      );
      v_inserted := v_inserted + 1;
    end loop;
    return v_inserted;
  end if;

  return 0;
end;
$$;

-- Geração automática logo após inserir contrato (se não for personalizado vazio).
create or replace function public.tg_contract_generate_receivables()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.forma_pagamento <> 'personalizado'
     or (new.parcelas_personalizadas is not null and jsonb_array_length(new.parcelas_personalizadas) > 0) then
    perform public.generate_receivables(new.id);
  end if;
  return new;
end;
$$;

create trigger contracts_after_insert_generate
  after insert on public.contracts
  for each row execute function public.tg_contract_generate_receivables();

-- RLS
alter table public.receivables enable row level security;
alter table public.receivable_payments enable row level security;

create policy "receivables_read"
  on public.receivables for select
  using (
    public.is_financeiro_or_admin()
    or contract_id in (
      select id from public.contracts
       where created_by = auth.uid()
          or vendedor_id in (select seller_id from public.profiles where id = auth.uid())
    )
  );

create policy "receivables_fin_write"
  on public.receivables for update
  using (public.is_financeiro_or_admin())
  with check (public.is_financeiro_or_admin());

-- Inserts vêm apenas da função RPC (security definer); nenhuma policy
-- permite insert manual via API exceto admin.
create policy "receivables_admin_insert"
  on public.receivables for insert
  with check (public.is_admin());

create policy "receivables_admin_delete"
  on public.receivables for delete
  using (public.is_admin());

create policy "receivable_payments_read"
  on public.receivable_payments for select
  using (
    public.is_financeiro_or_admin()
    or receivable_id in (
      select r.id from public.receivables r
        join public.contracts c on c.id = r.contract_id
       where c.created_by = auth.uid()
          or c.vendedor_id in (select seller_id from public.profiles where id = auth.uid())
    )
  );

create policy "receivable_payments_fin_write"
  on public.receivable_payments for all
  using (public.is_financeiro_or_admin())
  with check (public.is_financeiro_or_admin());
