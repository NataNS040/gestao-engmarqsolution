# Sistema Financeiro — EngMarq Solution

Sistema web de gestão financeira (gestão à vista) para a **EngMarq Solution**.
Stack: **Vite + React 18 + TypeScript + TailwindCSS + shadcn/ui + Supabase (Postgres + Auth + RLS + Edge Functions)**.

> Identidade visual: ver [MANUAL-IDENTIDADE-VISUAL.md](MANUAL-IDENTIDADE-VISUAL.md).

---

## Status

| Fase | Escopo | Status |
| ---- | ------ | ------ |
| 0 | Fundação (auth, layout, roles, RLS, audit, seed, identidade) | concluída |
| 1 | MVP — Empresas, Vendedores, Impostos, Contratos, Contas a Receber, Dashboard básico | concluída |
| 2 | Fiscal, Comissões progressivas, Contas a Pagar, Fluxo de Caixa | concluída |
| 3 | Relatórios PDF/Excel, Dashboard executivo, Auditoria UI | concluída |
| 4 | Preparação para produção (deploy, bootstrap admin, code-split) | concluída |

---

## Pré-requisitos

- **Node.js 20+** e npm
- [Supabase CLI](https://supabase.com/docs/guides/cli)
- Conta na Vercel (ou plataforma de SPA equivalente)
- Projeto Supabase remoto (plano Free é suficiente para começar)

## Setup local

```powershell
npm install
Copy-Item .env.example .env
# preencha VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY

# (opção A) Supabase local
supabase start
npm run db:reset       # aplica migrations + seed
npm run db:types       # gera tipos TypeScript

# (opção B) Supabase remoto
supabase link --project-ref <SEU_REF>
npm run db:push
npm run db:types:remote

npm run dev            # http://localhost:5173
```

## Scripts

| Comando | Função |
| ------- | ------ |
| `npm run dev` | Dev server (5173) |
| `npm run build` | Build de produção |
| `npm run preview` | Servir o build |
| `npm run typecheck` | TypeScript sem emitir |
| `npm run check:env` | Confere variáveis `VITE_*` |
| `npm run db:reset` | `supabase db reset` (local) |
| `npm run db:push` | `supabase db push` (remoto) |
| `npm run db:types` / `db:types:remote` | Regenera `src/lib/database.types.ts` |
| `npm run fn:deploy` | Deploy da Edge Function `invite-user` |
| `npm run bootstrap:admin <email> <senha> [nome]` | Cria/promove o primeiro admin |

## Deploy de produção (Vercel + Supabase)

**1. Banco**
```powershell
supabase link --project-ref <SEU_REF>
supabase db push                       # aplica migrations 0001 a 0010
# o seed roda automático em supabase db reset; em produção, aplique manualmente:
supabase db execute --file supabase/seed.sql
```

**2. Edge Function de convite**
```powershell
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<service_role>
supabase functions deploy invite-user
```
A função valida o JWT do chamador, confere `profiles.role = 'admin'` e usa
`auth.admin.inviteUserByEmail()` para enviar o convite por e-mail.

**3. Primeiro administrador**
```powershell
$env:SUPABASE_URL="https://xxx.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="eyJ..."
npm run bootstrap:admin admin@engmarq.com "Senha@Forte123" "Administrador"
```

**4. Frontend na Vercel**
- Import do repositório → framework **Vite** (auto)
- Variáveis: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- `vercel.json` já configurado (`buildCommand`, `outputDirectory`, rewrite SPA)

**5. Checklist final**
- [ ] Confirmar `tax_settings` vigente (seed = 6 %)
- [ ] Confirmar `commission_tiers` 8 %/9 %/10 %
- [ ] Confirmar categorias de despesa (`financial_categories`)
- [ ] Smoke test: criar empresa → contrato → marcar recebimento → fechar comissão → gerar conta a pagar
- [ ] Validar RLS: usuário `comercial` só vê seus contratos
- [ ] Exportar relatório PDF e Excel
- [ ] Conferir `audit_logs` recebendo eventos

## Arquitetura

```
src/
  app/              router + providers
  components/
    ui/             primitivos shadcn
    layout/         AppShell + Sidebar + Topbar
    shared/         PageHeader, DataTable, StatusBadge
  features/
    auth/           AuthContext, Login, ProtectedRoute
    dashboard/      Dashboard executivo
    companies/      CRUD empresas
    sellers/        CRUD vendedores
    contracts/      contratos + preview de parcelas
    receivables/    contas a receber + baixa de pagamento
    invoices/       notas fiscais (emissão manual)
    payables/       contas a pagar
    commissions/    fechamento progressivo + pagamento
    cashflow/       saldo + projeção 30/60/90d
    reports/        relatórios PDF + Excel
    audit/          consulta de auditoria (admin)
    settings/       usuários (admin) + impostos
  lib/              supabase client, format, permissions, types
  styles/           globals.css (tokens da marca)

supabase/
  migrations/       0001 → 0010 (versionado)
  functions/        invite-user (Edge)
  seed.sql          dados iniciais idempotentes

scripts/
  bootstrap-admin.mjs   cria/promove primeiro admin
  check-env.mjs         valida variáveis VITE_*
```

## Regras de negócio implementadas

- **Imposto vigente** — `tax_settings` com janela de vigência; valor snapshotado no contrato no momento da criação.
- **Geração automática de parcelas** — `generate_receivables()` cobre `a_vista`, `50_50`, `2x`, `3x`, `personalizado`.
- **Status automático de recebíveis** — derivado da soma de `receivable_payments`; vencidos detectados por `mark_overdue_receivables()`.
- **Notas fiscais** — geradas em placeholder por trigger, conforme `modelo_emissao_nf` do contrato (`por_parcela` | `encerramento`).
- **Comissões progressivas** — base = **valor líquido recebido no mês**; faixas 8 % até R$ 30 k, 9 % até R$ 45 k, 10 % acima. `preview_commission()` + `close_commission()` (idempotente).
- **RLS** — `admin` e `financeiro` veem tudo; `comercial` só vê empresas/contratos/recebíveis dos contratos do próprio vendedor.
- **Auditoria** — trigger genérico grava insert/update/delete com `valor_anterior`/`valor_novo` em JSONB; apenas admin lê.

## Licença

Proprietário — EngMarq Solution.
