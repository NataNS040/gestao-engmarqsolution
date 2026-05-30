import { useQuery } from "@tanstack/react-query";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  ResponsiveContainer, Legend,
} from "recharts";
import { supabase } from "@/lib/supabase";
import { formatMoney } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/PageHeader";

interface ReceivableLite {
  valor_previsto: number; valor_recebido: number;
  data_prevista: string; data_recebimento: string | null;
  status: "pendente" | "pago" | "parcial" | "vencido";
  contracts: { companies: { razao_social: string } | null } | null;
}
interface PayLite {
  valor: number; data_vencimento: string; data_pagamento: string | null;
  status: "pendente" | "pago" | "vencido";
}
interface ContractLite {
  valor_bruto: number; valor_liquido: number; data_assinatura: string;
  companies: { razao_social: string } | null;
  sellers: { nome: string } | null;
}

export default function DashboardPage() {
  const { data: receivables = [], isLoading } = useQuery({
    queryKey: ["dashboard", "receivables"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("receivables")
        .select("valor_previsto, valor_recebido, data_prevista, data_recebimento, status, contracts(companies(razao_social))");
      if (error) throw error;
      return ((data ?? []) as unknown) as ReceivableLite[];
    },
  });

  const { data: payables = [] } = useQuery({
    queryKey: ["dashboard", "payables"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payables").select("valor, data_vencimento, data_pagamento, status");
      if (error) throw error;
      return (data ?? []) as PayLite[];
    },
  });

  const { data: contracts = [] } = useQuery({
    queryKey: ["dashboard", "contracts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contracts")
        .select("valor_bruto, valor_liquido, data_assinatura, companies(razao_social), sellers(nome)");
      if (error) throw error;
      return ((data ?? []) as unknown) as ContractLite[];
    },
  });

  const now = new Date();
  const ym = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  const currentMonth = ym(now);
  const currentYear = String(now.getFullYear());

  const cards = receivables.reduce(
    (acc, r) => {
      const recebido = Number(r.valor_recebido);
      const previsto = Number(r.valor_previsto);
      const aberto = previsto - recebido;
      if (r.data_recebimento) {
        const dr = new Date(r.data_recebimento);
        if (ym(dr) === currentMonth) acc.recebidoMes += recebido;
        if (String(dr.getFullYear()) === currentYear) acc.recebidoAno += recebido;
      }
      if (r.status === "pendente" || r.status === "parcial") acc.previsto += aberto;
      if (r.status === "vencido") acc.vencido += aberto;
      return acc;
    },
    { recebidoMes: 0, recebidoAno: 0, previsto: 0, vencido: 0 }
  );

  const faturamento = contracts.reduce(
    (acc, c) => {
      const dt = new Date(c.data_assinatura);
      const bruto = Number(c.valor_bruto);
      if (ym(dt) === currentMonth) acc.mes += bruto;
      if (String(dt.getFullYear()) === currentYear) acc.ano += bruto;
      return acc;
    },
    { mes: 0, ano: 0 }
  );

  const entradasReal = receivables.reduce((s, r) => s + Number(r.valor_recebido), 0);
  const saidasReal = payables.reduce((s, p) => s + (p.data_pagamento ? Number(p.valor) : 0), 0);
  const saldoAtual = entradasReal - saidasReal;

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const proj90 = (() => {
    const limit = new Date(today); limit.setDate(limit.getDate() + 90);
    const entradas = receivables.reduce((s, r) => {
      if (r.status === "pago") return s;
      const dt = new Date(r.data_prevista);
      return dt <= limit ? s + (Number(r.valor_previsto) - Number(r.valor_recebido)) : s;
    }, 0);
    const saidas = payables.reduce((s, p) => {
      if (p.status === "pago") return s;
      const dt = new Date(p.data_vencimento);
      return dt <= limit ? s + Number(p.valor) : s;
    }, 0);
    return saldoAtual + entradas - saidas;
  })();

  const months: string[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(ym(d));
  }
  const byMonth = Object.fromEntries(months.map((m) => [m, { mes: m, previsto: 0, recebido: 0 }]));
  for (const r of receivables) {
    const m = r.data_prevista.slice(0, 7);
    if (byMonth[m]) byMonth[m].previsto += Number(r.valor_previsto);
    if (r.data_recebimento) {
      const mr = r.data_recebimento.slice(0, 7);
      if (byMonth[mr]) byMonth[mr].recebido += Number(r.valor_recebido);
    }
  }
  const series = months.map((m) => byMonth[m]);

  const topCustomers = aggregate(
    receivables.filter((r) => r.data_recebimento && String(new Date(r.data_recebimento).getFullYear()) === currentYear),
    (r) => r.contracts?.companies?.razao_social ?? "—",
    (r) => Number(r.valor_recebido)
  ).slice(0, 5);

  const topSellers = aggregate(
    contracts.filter((c) => String(new Date(c.data_assinatura).getFullYear()) === currentYear),
    (c) => c.sellers?.nome ?? "Sem vendedor",
    (c) => Number(c.valor_bruto)
  ).slice(0, 5);

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard Executivo" description="Visão consolidada da EngMarq Solution." />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi label="Faturamento no mês" value={faturamento.mes} tone="navy" />
        <Kpi label="Faturamento no ano" value={faturamento.ano} tone="navy" />
        <Kpi label="Recebido no mês"    value={cards.recebidoMes} tone="success" loading={isLoading} />
        <Kpi label="Recebido no ano"    value={cards.recebidoAno} tone="success" />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi label="Em aberto"             value={cards.previsto} />
        <Kpi label="Vencido"               value={cards.vencido} tone="danger" />
        <Kpi label="Saldo atual"           value={saldoAtual} tone={saldoAtual >= 0 ? "success" : "danger"} />
        <Kpi label="Saldo projetado (90d)" value={proj90} tone={proj90 >= 0 ? "success" : "danger"} />
      </div>

      <Card>
        <CardHeader><CardTitle>Fluxo de recebimentos (últimos 6 meses)</CardTitle></CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="g-prev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1a365d" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#1a365d" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="g-rec" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#e5e7eb" vertical={false} />
              <XAxis dataKey="mes" tick={{ fontSize: 12, fill: "#6b7280" }} />
              <YAxis tick={{ fontSize: 12, fill: "#6b7280" }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => formatMoney(v)} contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb" }} />
              <Legend />
              <Area type="monotone" dataKey="previsto" name="Previsto" stroke="#1a365d" fill="url(#g-prev)" strokeWidth={2} />
              <Area type="monotone" dataKey="recebido" name="Recebido" stroke="#10b981" fill="url(#g-rec)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Top 5 empresas (recebido no ano)</CardTitle></CardHeader>
          <CardContent className="h-64">
            <RankingChart data={topCustomers} color="#1a365d" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Top 5 vendedores (faturamento no ano)</CardTitle></CardHeader>
          <CardContent className="h-64">
            <RankingChart data={topSellers} color="#f5a623" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function aggregate<T>(rows: T[], keyFn: (r: T) => string, valFn: (r: T) => number) {
  const map = new Map<string, number>();
  for (const r of rows) map.set(keyFn(r), (map.get(keyFn(r)) ?? 0) + valFn(r));
  return Array.from(map, ([nome, valor]) => ({ nome, valor })).sort((a, b) => b.valor - a.valor);
}

function RankingChart({ data, color }: { data: { nome: string; valor: number }[]; color: string }) {
  if (data.length === 0) {
    return <p className="flex h-full items-center justify-center text-sm text-muted-foreground">Sem dados no período.</p>;
  }
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 5 }}>
        <CartesianGrid stroke="#e5e7eb" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 11, fill: "#6b7280" }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
        <YAxis type="category" dataKey="nome" tick={{ fontSize: 11, fill: "#1a365d" }} width={130} />
        <Tooltip formatter={(v: number) => formatMoney(v)} contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb" }} />
        <Bar dataKey="valor" fill={color} radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function Kpi({
  label, value, tone, loading,
}: { label: string; value: number; tone?: "success" | "danger" | "navy"; loading?: boolean }) {
  const color =
    tone === "success" ? "text-success" :
    tone === "danger"  ? "text-destructive" :
    "text-navy";
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className={`font-display text-2xl font-bold ${color}`}>{loading ? "…" : formatMoney(value)}</p>
      </CardContent>
    </Card>
  );
}
