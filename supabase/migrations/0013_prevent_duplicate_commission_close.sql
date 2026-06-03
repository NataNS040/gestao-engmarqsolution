-- =============================================================
-- 0013_prevent_duplicate_commission_close.sql
-- Impede gerar dois fechamentos de comissão para o mesmo vendedor
-- e mesmo período — o que duplicava as Contas a Pagar geradas.
-- =============================================================

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
  v_existing uuid;
begin
  -- Garante exclusividade: um fechamento por vendedor/período
  select id into v_existing
    from public.commission_calculations
   where vendedor_id   = p_vendedor_id
     and periodo_inicio = p_inicio
     and periodo_fim    = p_fim
   limit 1;

  if v_existing is not null then
    raise exception 'Já existe um fechamento para este vendedor e período (id=%).', v_existing
      using errcode = '23505';
  end if;

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
