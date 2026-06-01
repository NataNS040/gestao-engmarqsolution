-- =============================================================
-- 0011_fix_commission_trigger.sql
-- Adiciona SECURITY DEFINER ao trigger de recompute de status
-- para garantir que o UPDATE em commission_calculations execute
-- com privilégios suficientes independentemente do usuário que
-- disparou o pagamento.
-- =============================================================

create or replace function public.tg_commission_recompute_status()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_calc_id uuid := coalesce(new.calculation_id, old.calculation_id);
  v_paid    numeric(14,2);
  v_total   numeric(14,2);
begin
  select coalesce(sum(valor_pago), 0) into v_paid
    from public.commission_payments where calculation_id = v_calc_id;

  select comissao_calculada into v_total
    from public.commission_calculations where id = v_calc_id;

  update public.commission_calculations
     set status = case when v_paid >= v_total then 'pago' else 'pendente' end
   where id = v_calc_id;

  return coalesce(new, old);
end;
$$;
