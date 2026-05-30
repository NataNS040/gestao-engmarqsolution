import { useQuery } from "@tanstack/react-query";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend,
} from "recharts";
import { supabase } from "@/lib/supabase";
import { formatMoney } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/PageHeader";

interface RecLite {
  valor_previsto: number;
  valor_recebido: number;
  data_prevista: string;
  data_recebimento: string | null;
  status: "pendente" | "pago" | "parcial" | "vencido";
}
interface PayLite {
  valor: number;
  data_vencimento: string;
  data_pagamento: string | null;
  status: "pendente" | "pago" | "vencido";
}

export default function CashflowPage() {
  const { data: receivables = [] } = useQuery({
    queryKey: ["cashflow", "receivables"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("receivables")
        .select("valor_previsto, valor_recebido, data_prevista, data_recebimento, status");
      if (error) throw error;
      return (data ?? []) as RecLite[];
    },
  });

  const { data: payables = [] } = useQuery({
    queryKey: ["cashflow", "payables"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payables")
        .select("valor, data_vencimento, data_pagamento, status");
      if (error) throw error;
      return (data ?? []) as PayLite[];
    },
  });

  // Saldo realizado (somente o que já entrou - já saiu)
  const entradasRealizadas = receivables.reduce((s, r) => s + Number(r.valor_recebido), 0);
  const saidasRealizadas = payables.reduce(
    (s, p) => s + (p.data_pagamento ? Number(p.valor) : 0),
    0
  );
  const saldoAtual = entradasRealizadas - saidasRealizadas;

  // Projeções por horizonte
  const horizons = [30, 60, 90];
  const today = new Date(); today.setHours(0, 0, 0, 0);

  const proj = horizons.map((d) => {
    const limit = new Date(today); limit.setDate(limit.getDate() + d);

    const entradasPrev = receivables.reduce((s, r) => {
      if (r.status === "pago") return s;
      const dt = new Date(r.data_prevista);
      if (dt <= limit) return s + (Number(r.valor_previsto) - Number(r.valor_recebido));
      return s;
    }, 0);

    const saidasPrev = payables.reduce((s, p) => {
      if (p.status === "pago") return s;
      const dt = new Date(p.data_vencimento);
      if (dt <= limit) return s + Number(p.valor);
      return s;
    }, 0);

    return {
      horizonte: `${d}d`,
      entradas: entradasPrev,
      saidas: saidasPrev,
      saldo: saldoAtual + entradasPrev - saidasPrev,
    };
  });

  // KPIs adicionais (totais previstos x realizados)
  const entradasPrevTodas = receivables.reduce(
    (s, r) => s + (r.status === "pago" ? 0 : Number(r.valor_previsto) - Number(r.valor_recebido)),
    0
  );
  const saidasPrevTodas = payables.reduce(
    (s, p) => s + (p.status === "pago" ? 0 : Number(p.valor)),
    0
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fluxo de Caixa"
        description="Saldo realizado e projeções para 30, 60 e 90 dias."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Entradas realizadas" value={entradasRealizadas} tone="success" />
        <Kpi label="Saídas realizadas"   value={saidasRealizadas} tone="danger" />
        <Kpi label="Saldo atual"         value={saldoAtual} tone={saldoAtual >= 0 ? "success" : "danger"} />
        <Kpi label="Saldo projetado (90d)" value={proj[2].saldo} tone={proj[2].saldo >= 0 ? "success" : "danger"} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Kpi label="Entradas previstas (em aberto)" value={entradasPrevTodas} />
        <Kpi label="Saídas previstas (em aberto)"   value={saidasPrevTodas} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Projeção 30 / 60 / 90 dias</CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={proj} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="#e5e7eb" vertical={false} />
              <XAxis dataKey="horizonte" tick={{ fontSize: 12, fill: "#6b7280" }} />
              <YAxis
                tick={{ fontSize: 12, fill: "#6b7280" }}
                tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                formatter={(v: number) => formatMoney(v)}
                contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb" }}
              />
              <Legend />
              <Bar dataKey="entradas" name="Entradas previstas"  fill="#10b981" radius={[6, 6, 0, 0]} />
              <Bar dataKey="saidas"   name="Saídas previstas"    fill="#dc2626" radius={[6, 6, 0, 0]} />
              <Bar dataKey="saldo"    name="Saldo projetado"     fill="#1a365d" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

function Kpi({ label, value, tone }: { label: string; value: number; tone?: "success" | "danger" }) {
  const color = tone === "success" ? "text-success" : tone === "danger" ? "text-destructive" : "text-navy";
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className={`font-display text-2xl font-bold ${color}`}>{formatMoney(value)}</p>
      </CardContent>
    </Card>
  );
}
