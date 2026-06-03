-- =============================================================
-- 0014_sync_commission_status_with_payable.sql
-- Quando uma Conta a Pagar vinculada a um pagamento de comissão
-- (commission_payment_id) é marcada/desmarcada como paga, o status
-- do fechamento de comissão correspondente é atualizado.
-- =============================================================

create or replace function public.tg_payable_sync_commission_status()
returns trigger language plpgsql as $$
declare
  v_calc_id  uuid;
  v_total    numeric(14,2);
  v_paid     numeric(14,2);
begin
  -- Só interessa quando a payable está vinculada a um pagamento de comissão
  if new.commission_payment_id is null then
    return new;
  end if;

  -- Localiza o cálculo associado
  select calculation_id into v_calc_id
    from public.commission_payments
   where id = new.commission_payment_id;

  if v_calc_id is null then
    return new;
  end if;

  select comissao_calculada into v_total
    from public.commission_calculations
   where id = v_calc_id;

  -- Soma valor pago apenas dos commission_payments cuja Conta a Pagar
  -- correspondente esteja efetivamente paga (status = 'pago').
  select coalesce(sum(cp.valor_pago), 0) into v_paid
    from public.commission_payments cp
    left join public.payables p on p.commission_payment_id = cp.id
   where cp.calculation_id = v_calc_id
     and (p.id is null or p.status = 'pago');

  update public.commission_calculations
     set status = (case when v_paid >= v_total and v_total > 0 then 'pago' else 'pendente' end)::public.commission_status
   where id = v_calc_id;

  return new;
end;
$$;

drop trigger if exists payables_sync_commission on public.payables;
create trigger payables_sync_commission
  after insert or update of status, commission_payment_id, data_pagamento on public.payables
  for each row execute function public.tg_payable_sync_commission_status();
