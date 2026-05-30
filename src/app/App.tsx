import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { AuthProvider } from "@/features/auth/AuthContext";
import { ProtectedRoute } from "@/features/auth/ProtectedRoute";
import { AppShell } from "@/components/layout/AppShell";
import LoginPage from "@/features/auth/LoginPage";
import DashboardPage from "@/features/dashboard/DashboardPage";
import UsersAdminPage from "@/features/settings/UsersAdminPage";
import TaxSettingsPage from "@/features/settings/TaxSettingsPage";
import CompaniesPage from "@/features/companies/CompaniesPage";
import SellersPage from "@/features/sellers/SellersPage";
import ContractsPage from "@/features/contracts/ContractsPage";
import ReceivablesPage from "@/features/receivables/ReceivablesPage";
import InvoicesPage from "@/features/invoices/InvoicesPage";
import PayablesPage from "@/features/payables/PayablesPage";
import CommissionsPage from "@/features/commissions/CommissionsPage";
import CashflowPage from "@/features/cashflow/CashflowPage";
import ReportsPage from "@/features/reports/ReportsPage";
import AuditPage from "@/features/audit/AuditPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, refetchOnWindowFocus: false },
  },
});

const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <AppShell />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "empresas", element: <CompaniesPage /> },
      { path: "contratos", element: <ContractsPage /> },
      { path: "receber", element: <ReceivablesPage /> },
      { path: "notas-fiscais", element: <InvoicesPage /> },
      { path: "pagar", element: <PayablesPage /> },
      { path: "vendedores", element: <SellersPage /> },
      { path: "comissoes", element: <CommissionsPage /> },
      { path: "fluxo-caixa", element: <CashflowPage /> },
      { path: "relatorios", element: <ReportsPage /> },
      {
        path: "auditoria",
        element: (
          <ProtectedRoute roles={["admin"]}>
            <AuditPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "configuracoes",
        element: <ProtectedRoute roles={["admin"]}><Navigate to="usuarios" replace /></ProtectedRoute>,
      },
      {
        path: "configuracoes/usuarios",
        element: (
          <ProtectedRoute roles={["admin"]}>
            <UsersAdminPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "configuracoes/impostos",
        element: (
          <ProtectedRoute roles={["admin"]}>
            <TaxSettingsPage />
          </ProtectedRoute>
        ),
      },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={router} />
        <Toaster richColors position="top-right" />
      </AuthProvider>
    </QueryClientProvider>
  );
}
