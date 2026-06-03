-- =============================================================
-- 0010_commissions.sql
-- Cálculo, fechamento e pagamento de comissões.
--
-- Regras adotadas (confirmadas no plano):
--   - Base de cálculo: valor_liquido do contrato
--   - Momento: conforme RECEBIMENTO das parcelas (proteção de caixa)
--   - Acúmulo das faixas progressivas: MENSAL (zera a cada mês)
--
-- Para cada recebimento, calcula a parcela "líquida" proporcional
-- ao valor recebido: liquido_recebido = valor_recebido * (valor_liquido_contrato / valor_bruto_contrato)
-- =============================================================

create table public.commission_calculations (
  id              uuid primary key default gen_random_uuid(),
  vendedor_id     uuid not null references public.sellers(id),
  periodo_inicio  date not null,
  periodo_fim     date not null,
  total_vendido   numeric(14,2) not null default 0, -- bruto recebido no período
  total_liquido   numeric(14,2) not null default 0, -- líquido recebido no período
  comissao_calculada numeric(14,2) not null default 0,
  detalhamento    jsonb not null default '[]'::jsonb,
  status          public.commission_status not null default 'pendente',
  criado_em       timestamptz not null default now(),
  criado_por      uuid references public.profiles(id)
);

create index commission_calc_vendedor_idx on public.commission_calculations(vendedor_id);
create index commission_calc_periodo_idx  on public.commission_calculations(periodo_inicio, periodo_fim);

create trigger commission_calc_audit
  after insert or update or delete on public.commission_calculations
  for each row execute function public.audit_trigger();

-- Pagamentos de comissão (pode gerar Conta a Pagar vinculada)
create table public.commission_payments (
  id              uuid primary key default gen_random_uuid(),
  calculation_id  uuid not null references public.commission_calculations(id) on delete cascade,
  valor_pago      numeric(14,2) not null check (valor_pago > 0),
  data_pagamento  date not null default current_date,
  responsavel_id  uuid references public.profiles(id),
  payable_id      uuid references public.payables(id) on delete set null,
  observacoes     text,
  criado_em       timestamptz not null default now()
);

create index commission_pay_calc_idx on public.commission_payments(calculation_id);

create trigger commission_pay_audit
  after insert or update or delete on public.commission_payments
  for each row execute function public.audit_trigger();

-- FK retroativa em payables.commission_payment_id
alter table public.payables
  add constraint payables_commission_payment_fkey
  foreign key (commission_payment_id) references public.commission_payments(id) on delete set null;

-- Marca calculation como pago quando valor pago >= comissão calculada
create or replace function public.tg_commission_recompute_status()
returns trigger language plpgsql as $$
declare
  v_calc_id uuid := coalesce(new.calculation_id, old.calculation_id);
  v_paid    numeric(14,2);
  v_total   numeric(14,2);
begin
  select coalesce(sum(valor_pago),0) into v_paid
    from public.commission_payments where calculation_id = v_calc_id;
  select comissao_calculada into v_total
    from public.commission_calculations where id = v_calc_id;
  update public.commission_calculations
     set status = (case when v_paid >= v_total then 'pago' else 'pendente' end)::public.commission_status
   where id = v_calc_id;
  return coalesce(new, old);
end;
$$;

create trigger commission_pay_recompute
  after insert or update or delete on public.commission_payments
  for each row execute function public.tg_commission_recompute_status();

-- -------------------------------------------------------------
-- RPC: calcula comissão de um vendedor para um período arbitrário.
-- Acúmulo é feito agrupado por MÊS dentro do período (mensal),
-- e dentro de cada mês aplicado às faixas progressivas vigentes.
--
-- Retorna o cálculo SEM persistir; quem chama decide se salva.
-- -------------------------------------------------------------
create or replace function public.preview_commission(
  p_vendedor_id uuid,
  p_inicio      date,
  p_fim         date
)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_tiers           jsonb;
  v_months          jsonb := '[]'::jsonb;
  v_month_start     date;
  v_month_end       date;
  v_total_bruto     numeric(14,2) := 0;
  v_total_liquido   numeric(14,2) := 0;
  v_total_comissao  numeric(14,2) := 0;
  v_breakdown       jsonb := '[]'::jsonb;
begin
  -- Snapshot das faixas vigentes hoje (poderíamos refinar para vigência por mês)
  select coalesce(jsonb_agg(jsonb_build_object(
           'faixa', faixa, 'min', valor_minimo, 'max', valor_maximo, 'pct', percentual
         ) order by valor_minimo), '[]'::jsonb)
    into v_tiers
    from public.commission_tiers
   where vigencia_fim is null
      or (vigencia_inicio <= p_fim and (vigencia_fim is null or vigencia_fim >= p_inicio));

  v_month_start := date_trunc('month', p_inicio)::date;
  while v_month_start <= p_fim loop
    v_month_end := (date_trunc('month', v_month_start) + interval '1 month' - interval '1 day')::date;

    -- Acumulado líquido recebido pelo vendedor neste mês
    with rec as (
      select
        rp.data,
        rp.valor as valor_recebido,
        c.valor_bruto,
        c.valor_liquido,
        c.id as contract_id
      from public.receivable_payments rp
      join public.receivables r on r.id = rp.receivable_id
      join public.contracts c   on c.id = r.contract_id
     where c.vendedor_id = p_vendedor_id
       and rp.data >= greatest(v_month_start, p_inicio)
       and rp.data <= least(v_month_end, p_fim)
    ),
    agg as (
      select
        coalesce(sum(valor_recebido), 0)                                          as bruto_recebido,
        coalesce(sum(valor_recebido * (valor_liquido / nullif(valor_bruto, 0))),0) as liquido_recebido
      from rec
    )
    select bruto_recebido, liquido_recebido
      into v_total_bruto, v_total_liquido
      from agg;

    if v_total_liquido > 0 then
      -- Aplica faixas progressivas
      declare
        v_remaining numeric(14,2) := v_total_liquido;
        v_month_comissao numeric(14,2) := 0;
        v_tier jsonb;
        v_lo numeric; v_hi numeric; v_pct numeric;
        v_slice numeric;
        v_slices jsonb := '[]'::jsonb;
      begin
        for v_tier in select * from jsonb_array_elements(v_tiers) loop
          v_lo  := (v_tier->>'min')::numeric;
          v_hi  := nullif(v_tier->>'max','')::numeric;
          v_pct := (v_tier->>'pct')::numeric;

          if v_total_liquido <= v_lo then
            continue;
          end if;

          v_slice := least(v_total_liquido, coalesce(v_hi, v_total_liquido)) - v_lo;
          if v_slice <= 0 then continue; end if;

          v_month_comissao := v_month_comissao + round(v_slice * v_pct / 100, 2);
          v_slices := v_slices || jsonb_build_object(
            'faixa', v_tier->'faixa',
            'base', v_slice,
            'percentual', v_pct,
            'comissao', round(v_slice * v_pct / 100, 2)
          );
        end loop;

        v_months := v_months || jsonb_build_object(
          'mes',            to_char(v_month_start, 'YYYY-MM'),
          'bruto_recebido', v_total_bruto,
          'liquido_recebido', v_total_liquido,
          'comissao',       v_month_comissao,
          'faixas',         v_slices
        );
        v_total_comissao := v_total_comissao + v_month_comissao;
      end;
    end if;

    v_month_start := (v_month_start + interval '1 month')::date;
  end loop;

  -- Totais finais agregados (não os mensais)
  select
    coalesce(sum((m->>'bruto_recebido')::numeric), 0),
    coalesce(sum((m->>'liquido_recebido')::numeric), 0)
    into v_total_bruto, v_total_liquido
    from jsonb_array_elements(v_months) m;

  v_breakdown := jsonb_build_object(
    'vendedor_id', p_vendedor_id,
    'periodo_inicio', p_inicio,
    'periodo_fim', p_fim,
    'total_bruto_recebido', v_total_bruto,
    'total_liquido_recebido', v_total_liquido,
    'comissao_total', v_total_comissao,
    'meses', v_months,
    'faixas_vigentes', v_tiers
  );

  return v_breakdown;
end;
$$;

-- Versão que persiste o cálculo (chamada pelo botão "Fechar comissão")
create or replace function public.close_commission(
  p_vendedor_id uuid,
  p_inicio      date,
  p_fim         date
)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_preview jsonb;
  v_id      uuid;
begin
  v_preview := public.preview_commission(p_vendedor_id, p_inicio, p_fim);

  insert into public.commission_calculations
    (vendedor_id, periodo_inicio, periodo_fim, total_vendido, total_liquido,
     comissao_calculada, detalhamento, criado_por)
  values (
    p_vendedor_id, p_inicio, p_fim,
    coalesce((v_preview->>'total_bruto_recebido')::numeric, 0),
    coalesce((v_preview->>'total_liquido_recebido')::numeric, 0),
    coalesce((v_preview->>'comissao_total')::numeric, 0),
    v_preview,
    auth.uid()
  )
  returning id into v_id;

  return v_id;
end;
$$;

-- -------------------------------------------------------------
-- RLS
-- -------------------------------------------------------------
alter table public.commission_calculations enable row level security;
alter table public.commission_payments     enable row level security;

create policy "comm_calc_read"
  on public.commission_calculations for select
  using (
    public.is_financeiro_or_admin()
    or vendedor_id in (select seller_id from public.profiles where id = auth.uid())
  );

create policy "comm_calc_write"
  on public.commission_calculations for all
  using (public.is_financeiro_or_admin())
  with check (public.is_financeiro_or_admin());

create policy "comm_pay_read"
  on public.commission_payments for select
  using (
    public.is_financeiro_or_admin()
    or calculation_id in (
      select id from public.commission_calculations
       where vendedor_id in (select seller_id from public.profiles where id = auth.uid())
    )
  );

create policy "comm_pay_write"
  on public.commission_payments for all
  using (public.is_financeiro_or_admin())
  with check (public.is_financeiro_or_admin());
