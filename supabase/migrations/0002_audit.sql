-- =============================================================
-- 0002_audit.sql
-- Trigger genérica de auditoria: registra inserts/updates/deletes
-- em uma única tabela `audit_logs`. Anexada caso-a-caso nas
-- migrations de cada feature (contracts, receivables, ...).
-- =============================================================

create table public.audit_logs (
  id              bigserial primary key,
  tabela          text not null,
  registro_id     text not null,
  acao            public.audit_action not null,
  valor_anterior  jsonb,
  valor_novo      jsonb,
  user_id         uuid,
  user_email      text,
  criado_em       timestamptz not null default now()
);

create index audit_logs_tabela_idx     on public.audit_logs(tabela);
create index audit_logs_registro_idx   on public.audit_logs(tabela, registro_id);
create index audit_logs_user_idx       on public.audit_logs(user_id);
create index audit_logs_criado_em_idx  on public.audit_logs(criado_em desc);

alter table public.audit_logs enable row level security;

create policy "audit_logs_admin_read"
  on public.audit_logs for select
  using (public.is_admin());

-- Apenas o próprio trigger (security definer) escreve em audit_logs.
-- Nenhuma policy de insert/update/delete = ninguém escreve via API.

create or replace function public.audit_trigger()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_user_id    uuid := auth.uid();
  v_user_email text;
  v_id         text;
  v_old        jsonb;
  v_new        jsonb;
  v_action     public.audit_action;
begin
  if v_user_id is not null then
    select email into v_user_email from auth.users where id = v_user_id;
  end if;

  if tg_op = 'INSERT' then
    v_action := 'insert';
    v_new := to_jsonb(new);
    v_id := coalesce((v_new->>'id'), '');
  elsif tg_op = 'UPDATE' then
    v_action := 'update';
    v_old := to_jsonb(old);
    v_new := to_jsonb(new);
    v_id := coalesce((v_new->>'id'), (v_old->>'id'), '');
  elsif tg_op = 'DELETE' then
    v_action := 'delete';
    v_old := to_jsonb(old);
    v_id := coalesce((v_old->>'id'), '');
  end if;

  insert into public.audit_logs (tabela, registro_id, acao, valor_anterior, valor_novo, user_id, user_email)
  values (tg_table_name, v_id, v_action, v_old, v_new, v_user_id, v_user_email);

  return coalesce(new, old);
end;
$$;

comment on function public.audit_trigger() is
  'Trigger genérica de auditoria. Use: CREATE TRIGGER ... AFTER INSERT OR UPDATE OR DELETE ON <tabela> FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();';
