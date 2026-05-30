-- =============================================================
-- 0004_companies.sql
-- Cadastro de clientes (empresas)
-- =============================================================

create table public.companies (
  id              uuid primary key default gen_random_uuid(),
  razao_social    text not null,
  nome_fantasia   text,
  cnpj            text not null unique,
  responsavel     text,
  telefone        text,
  email           text,
  endereco        text,
  observacoes     text,
  created_by      uuid references public.profiles(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index companies_razao_idx on public.companies (lower(razao_social));
create index companies_cnpj_idx  on public.companies (cnpj);

create trigger companies_updated_at
  before update on public.companies
  for each row execute function public.tg_set_updated_at();

create trigger companies_audit
  after insert or update or delete on public.companies
  for each row execute function public.audit_trigger();

alter table public.companies enable row level security;

-- admin/financeiro veem tudo; comercial vê só as que cadastrou
create policy "companies_read"
  on public.companies for select
  using (
    public.is_financeiro_or_admin()
    or created_by = auth.uid()
  );

create policy "companies_insert"
  on public.companies for insert
  with check (
    public.current_user_role() in ('admin', 'comercial')
    and created_by = auth.uid()
  );

create policy "companies_update"
  on public.companies for update
  using (public.is_admin() or created_by = auth.uid())
  with check (public.is_admin() or created_by = auth.uid());

create policy "companies_delete"
  on public.companies for delete
  using (public.is_admin());
