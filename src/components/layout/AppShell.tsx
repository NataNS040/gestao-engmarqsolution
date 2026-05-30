import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Building2,
  FileText,
  Wallet,
  Receipt,
  Users,
  Percent,
  TrendingUp,
  CreditCard,
  BarChart3,
  ShieldCheck,
  Settings,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/features/auth/AuthContext";
import { can, type UserRole } from "@/lib/permissions";
import type { ComponentType } from "react";

interface NavItem {
  to: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  visible: (role: UserRole) => boolean;
}

const NAV: NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, visible: () => true },
  { to: "/empresas", label: "Empresas", icon: Building2, visible: (r) => can(r, "read", "companies") },
  { to: "/contratos", label: "Contratos", icon: FileText, visible: (r) => can(r, "read", "contracts") },
  { to: "/receber", label: "Contas a Receber", icon: Wallet, visible: (r) => can(r, "read", "receivables") },
  { to: "/notas-fiscais", label: "Notas Fiscais", icon: Receipt, visible: (r) => can(r, "read", "invoices") },
  { to: "/pagar", label: "Contas a Pagar", icon: CreditCard, visible: (r) => can(r, "read", "payables") },
  { to: "/vendedores", label: "Vendedores", icon: Users, visible: (r) => can(r, "read", "sellers") },
  { to: "/comissoes", label: "Comissões", icon: Percent, visible: (r) => can(r, "read", "commissions") },
  { to: "/fluxo-caixa", label: "Fluxo de Caixa", icon: TrendingUp, visible: (r) => can(r, "read", "reports") },
  { to: "/relatorios", label: "Relatórios", icon: BarChart3, visible: (r) => can(r, "read", "reports") },
  { to: "/auditoria", label: "Auditoria", icon: ShieldCheck, visible: (r) => can(r, "read", "audit_logs") },
  { to: "/configuracoes/impostos", label: "Impostos", icon: Percent, visible: (r) => r === "admin" },
  { to: "/configuracoes/usuarios", label: "Usuários", icon: Settings, visible: (r) => r === "admin" },
];

export function AppShell() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const role = profile?.role ?? "comercial";

  async function handleLogout() {
    await signOut();
    navigate("/login", { replace: true });
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-muted">
      {/* Sidebar */}
      <aside className="flex w-64 flex-col bg-gradient-primary text-white shadow-xl">
        <div className="flex h-20 items-center gap-3 border-b border-white/10 px-5">
          <img
            src="/assets/logo%20engmarq%20solution%20melhor.png"
            alt="EngMarq"
            className="h-10 w-auto object-contain"
          />
          <div className="leading-tight">
            <p className="font-display text-sm font-bold">EngMarq</p>
            <p className="text-[11px] text-amber-light">Financeiro</p>
          </div>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
          {NAV.filter((i) => i.visible(role)).map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-white/15 text-white shadow-sm"
                    : "text-white/80 hover:bg-white/10 hover:text-white"
                )
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-white/10 p-4">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-white/80 transition-colors hover:bg-white/10 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </div>
      </aside>

      {/* Conteúdo */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 items-center justify-between border-b border-border bg-white px-6">
          <div>
            <p className="font-display text-lg font-bold text-navy">
              {profile?.full_name ?? "Usuário"}
            </p>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Perfil: {profile?.role ?? "—"}
            </p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-navy text-sm font-bold text-white">
            {(profile?.full_name ?? profile?.email ?? "U").slice(0, 1).toUpperCase()}
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
