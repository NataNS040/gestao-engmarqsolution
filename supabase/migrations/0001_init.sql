-- =============================================================
-- 0001_init.sql
-- Fundação: extensões, enums, profiles (sync com auth.users)
-- e helpers de role/auditoria reutilizados pelas demais migrations.
-- =============================================================

create extension if not exists "pgcrypto";

-- Enums de domínio
create type public.user_role            as enum ('admin', 'financeiro', 'comercial');
create type public.contract_status      as enum ('em_andamento', 'concluido', 'cancelado');
create type public.payment_form         as enum ('a_vista', '50_50', '2x', '3x', 'personalizado');
create type public.invoice_emission     as enum ('por_parcela', 'encerramento');
create type public.receivable_status    as enum ('pendente', 'pago', 'parcial', 'vencido');
create type public.payable_status       as enum ('pendente', 'pago', 'vencido');
create type public.invoice_status       as enum ('emitida', 'nao_emitida');
create type public.commission_status    as enum ('pendente', 'pago');
create type public.audit_action         as enum ('insert', 'update', 'delete');

-- -------------------------------------------------------------
-- profiles: espelha auth.users com role + dados de negócio
-- -------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  email       text not null,
  role        public.user_role not null default 'comercial',
  seller_id   uuid, -- preenchido depois de criar sellers; FK adicionada em 0002
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index profiles_role_idx on public.profiles(role);

-- Sincroniza inserts em auth.users -> profiles
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    coalesce((new.raw_user_meta_data->>'role')::public.user_role, 'comercial')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- updated_at automático
create or replace function public.tg_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.tg_set_updated_at();

-- -------------------------------------------------------------
-- Helper: role do usuário corrente (lido do JWT via profiles)
-- -------------------------------------------------------------
create or replace function public.current_user_role()
returns public.user_role
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean language sql stable as $$
  select public.current_user_role() = 'admin';
$$;

create or replace function public.is_financeiro_or_admin()
returns boolean language sql stable as $$
  select public.current_user_role() in ('admin', 'financeiro');
$$;

-- -------------------------------------------------------------
-- RLS em profiles
-- -------------------------------------------------------------
alter table public.profiles enable row level security;

create policy "profiles_self_read"
  on public.profiles for select
  using (id = auth.uid() or public.is_admin());

create policy "profiles_admin_write"
  on public.profiles for all
  using (public.is_admin())
  with check (public.is_admin());
