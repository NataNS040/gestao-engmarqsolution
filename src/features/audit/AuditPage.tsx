import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Eye, RefreshCcw } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatDateTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { PageHeader, DataTable } from "@/components/shared/PageHeader";

interface AuditRow {
  id: number;
  tabela: string;
  registro_id: string;
  acao: "insert" | "update" | "delete";
  valor_anterior: Record<string, unknown> | null;
  valor_novo: Record<string, unknown> | null;
  user_id: string | null;
  user_email: string | null;
  criado_em: string;
}

const TABLES = [
  "companies", "contracts", "receivables", "receivable_payments",
  "invoices", "payables", "sellers", "tax_settings",
  "commission_calculations", "commission_payments", "profiles",
];

export default function AuditPage() {
  const [tabela, setTabela] = useState("");
  const [acao, setAcao] = useState("");
  const [email, setEmail] = useState("");
  const [days, setDays] = useState(30);
  const [viewing, setViewing] = useState<AuditRow | null>(null);

  const { data: rows = [], isLoading, refetch } = useQuery({
    queryKey: ["audit", tabela, acao, email, days],
    queryFn: async () => {
      const since = new Date(Date.now() - days * 86400_000).toISOString();
      let q = supabase.from("audit_logs")
        .select("*")
        .gte("criado_em", since)
        .order("criado_em", { ascending: false })
        .limit(500);
      if (tabela) q = q.eq("tabela", tabela);
      if (acao) q = q.eq("acao", acao);
      if (email) q = q.ilike("user_email", `%${email}%`);
      const { data, error } = await q;
      if (error) throw error;
      return ((data ?? []) as unknown) as AuditRow[];
    },
  });

  const diff = useMemo(() => computeDiff(viewing), [viewing]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Auditoria"
        description="Histórico de alterações em todas as tabelas críticas (últimos 500 eventos)."
        actions={
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCcw className="h-4 w-4" /> Atualizar
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="space-y-1.5">
          <Label>Tabela</Label>
          <Select value={tabela} onChange={(e) => setTabela(e.target.value)}>
            <option value="">Todas</option>
            {TABLES.map((t) => <option key={t} value={t}>{t}</option>)}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Ação</Label>
          <Select value={acao} onChange={(e) => setAcao(e.target.value)}>
            <option value="">Todas</option>
            <option value="insert">Inserção</option>
            <option value="update">Atualização</option>
            <option value="delete">Exclusão</option>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>E-mail do usuário</Label>
          <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="contém…" />
        </div>
        <div className="space-y-1.5">
          <Label>Janela (dias)</Label>
          <Select value={String(days)} onChange={(e) => setDays(Number(e.target.value))}>
            <option value="7">7 dias</option>
            <option value="30">30 dias</option>
            <option value="90">90 dias</option>
            <option value="365">1 ano</option>
          </Select>
        </div>
      </div>

      <DataTable<AuditRow>
        loading={isLoading}
        rows={rows}
        columns={[
          { key: "data",  header: "Data/hora", cell: (r) => formatDateTime(r.criado_em) },
          { key: "user",  header: "Usuário",   cell: (r) => r.user_email ?? "—" },
          { key: "tab",   header: "Tabela",    cell: (r) => <code className="text-xs">{r.tabela}</code> },
          { key: "acao",  header: "Ação",      cell: (r) => <ActionBadge acao={r.acao} /> },
          { key: "reg",   header: "Registro",  cell: (r) => <code className="text-[11px] text-muted-foreground">{r.registro_id.slice(0, 8)}…</code> },
          { key: "acoes", header: "", className: "w-20 text-right", cell: (r) => (
            <Button size="icon" variant="ghost" onClick={() => setViewing(r)} title="Ver detalhes">
              <Eye className="h-4 w-4" />
            </Button>
          )},
        ]}
      />

      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Detalhes do evento</DialogTitle>
            {viewing && (
              <DialogDescription>
                {viewing.tabela} · {viewing.acao} · {formatDateTime(viewing.criado_em)} · {viewing.user_email ?? "sistema"}
              </DialogDescription>
            )}
          </DialogHeader>
          {viewing && (
            <div className="max-h-[60vh] space-y-3 overflow-y-auto">
              {diff.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem alterações registradas.</p>
              ) : (
                <table className="w-full text-xs">
                  <thead className="text-left text-muted-foreground">
                    <tr>
                      <th className="py-1">Campo</th>
                      <th className="py-1">Antes</th>
                      <th className="py-1">Depois</th>
                    </tr>
                  </thead>
                  <tbody>
                    {diff.map((d) => (
                      <tr key={d.key} className="border-t border-border align-top">
                        <td className="py-1.5 pr-3 font-semibold text-navy">{d.key}</td>
                        <td className="py-1.5 pr-3 text-destructive">{fmt(d.before)}</td>
                        <td className="py-1.5 text-success">{fmt(d.after)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ActionBadge({ acao }: { acao: string }) {
  if (acao === "insert") return <Badge variant="success">Inserção</Badge>;
  if (acao === "update") return <Badge variant="default">Atualização</Badge>;
  if (acao === "delete") return <Badge variant="danger">Exclusão</Badge>;
  return <Badge variant="muted">{acao}</Badge>;
}

function computeDiff(row: AuditRow | null): { key: string; before: unknown; after: unknown }[] {
  if (!row) return [];
  const before = row.valor_anterior ?? {};
  const after  = row.valor_novo ?? {};
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  const diffs: { key: string; before: unknown; after: unknown }[] = [];
  for (const k of keys) {
    const b = (before as Record<string, unknown>)[k];
    const a = (after as Record<string, unknown>)[k];
    if (row.acao === "update" && JSON.stringify(b) === JSON.stringify(a)) continue;
    diffs.push({ key: k, before: b, after: a });
  }
  return diffs.sort((x, y) => x.key.localeCompare(y.key));
}

function fmt(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}
