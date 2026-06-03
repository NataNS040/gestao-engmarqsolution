-- =============================================================
-- 0015_generate_receivables_12x.sql
-- Adiciona suporte ao tipo de pagamento '12x' (assessoria mensal)
-- na função generate_receivables.
-- =============================================================

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

  elsif c.forma_pagamento in ('2x', '3x', '12x') then
    v_total := case c.forma_pagamento when '2x' then 2 when '3x' then 3 when '12x' then 12 end;
    v_valor := round(c.valor_bruto / v_total, 2);
    v_resto := c.valor_bruto - v_valor * (v_total - 1);
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
