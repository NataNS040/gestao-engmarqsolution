export type UserRole = "admin" | "financeiro" | "comercial";

type Resource =
  | "users"
  | "companies"
  | "sellers"
  | "contracts"
  | "receivables"
  | "invoices"
  | "payables"
  | "commissions"
  | "tax_settings"
  | "reports"
  | "audit_logs";

type Action = "read" | "create" | "update" | "delete";

/**
 * Espelho client-side das políticas RLS. NÃO substitui o RLS no banco —
 * serve apenas para ocultar UI a usuários sem permissão.
 */
const MATRIX: Record<UserRole, Partial<Record<Resource, Action[]>>> = {
  admin: {
    users: ["read", "create", "update", "delete"],
    companies: ["read", "create", "update", "delete"],
    sellers: ["read", "create", "update", "delete"],
    contracts: ["read", "create", "update", "delete"],
    receivables: ["read", "create", "update", "delete"],
    invoices: ["read", "create", "update", "delete"],
    payables: ["read", "create", "update", "delete"],
    commissions: ["read", "create", "update", "delete"],
    tax_settings: ["read", "create", "update", "delete"],
    reports: ["read"],
    audit_logs: ["read"],
  },
  financeiro: {
    companies: ["read"],
    sellers: ["read"],
    contracts: ["read"],
    receivables: ["read", "create", "update"],
    invoices: ["read", "create", "update"],
    payables: ["read", "create", "update", "delete"],
    commissions: ["read", "update"],
    tax_settings: ["read"],
    reports: ["read"],
  },
  comercial: {
    companies: ["read", "create", "update"],
    contracts: ["read", "create", "update"],
    commissions: ["read"],
    receivables: ["read"],
    invoices: ["read"],
  },
};

export function can(role: UserRole, action: Action, resource: Resource) {
  return MATRIX[role]?.[resource]?.includes(action) ?? false;
}
