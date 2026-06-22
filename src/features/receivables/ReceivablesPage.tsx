import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { CheckCircle2, Pencil } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/features/auth/AuthContext";
import { formatMoney, formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { PageHeader, DataTable } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { MonthFilter, matchesMonth } from "@/components/shared/MonthFilter";

interface ReceivableRow {
  id: string;
  contract_id: string;
  company_id: string;
  numero_parcela: number;
  total_parcelas: number;
  valor_previsto: number;
  valor_recebido: number;
  data_prevista: string;
  data_recebimento: string | null;
  status: "pendente" | "pago" | "parcial" | "vencido";
  observacoes: string | null;
  contracts: { servico: string } | null;
  companies: { razao_social: string } | null;
}

export default function ReceivablesPage() {
  const { profile } = useAuth();
  const qc = useQueryClient();
  const [searchParams] = useSearchParams();
  const contractFilter = searchParams.get("contrato");

  const [statusFilter, setStatusFilter] = useState<string>("");
  const [monthFilter, setMonthFilter] = useState<string>("");
  const [paying, setPaying] = useState<ReceivableRow | null>(null);
  const [payValue, setPayValue] = useState("");
  const [payDate, setPayDate] = useState(new Date().toISOString().slice(0, 10));
  const [payForm, setPayForm] = useState("PIX");
  const [payNotes, setPayNotes] = useState("");

  const [editingDate, setEditingDate] = useState<ReceivableRow | null>(null);
  const [editDateVal, setEditDateVal] = useState("");

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["receivables", contractFilter],
    queryFn: async () => {
      let q = supabase
        .from("receivables")
        .select("*, contracts(servico), companies(razao_social)")
        .order("data_prevista");
      if (contractFilter) q = q.eq("contract_id", contractFilter);
      const { data, error } = await q;
      if (error) throw error;
      return ((data ?? []) as unknown) as ReceivableRow[];
    },
  });

  const filtered = useMemo(
    () => rows.filter((r) =>
      (statusFilter ? r.status === statusFilter : true) &&
      matchesMonth(r.data_prevista, monthFilter)
    ),
    [rows, statusFilter, monthFilter]
  );

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, r) => {
        acc.previsto += Number(r.valor_previsto);
        acc.recebido += Number(r.valor_recebido);
        if (r.status === "vencido") acc.vencido += Number(r.valor_previsto) - Number(r.valor_recebido);
        if (r.status === "pendente" || r.status === "parcial")
          acc.aberto += Number(r.valor_previsto) - Number(r.valor_recebido);
        return acc;
      },
      { previsto: 0, recebido: 0, vencido: 0, aberto: 0 }
    );
  }, [rows]);

  function openPayment(r: ReceivableRow) {
    setPaying(r);
    setPayValue(String((r.valor_previsto - r.valor_recebido).toFixed(2)));
    setPayDate(new Date().toISOString().slice(0, 10));
    setPayForm("PIX");
    setPayNotes("");
  }

  const pay = useMutation({
    mutationFn: async () => {
      if (!paying) return;
      const valor = Number(payValue);
      if (!Number.isFinite(valor) || valor <= 0) throw new Error("Valor inválido");
      const { error } = await supabase.from("receivable_payments").insert({
        receivable_id: paying.id,
        valor,
        data: payDate,
        forma_pagamento: payForm,
        observacoes: payNotes || null,
        registrado_por: profile?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Recebimento registrado.");
      qc.invalidateQueries({ queryKey: ["receivables"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      setPaying(null);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  const updateDate = useMutation({
    mutationFn: async () => {
      if (!editingDate || !editDateVal) return;
      const { error } = await supabase
        .from("receivables")
        .update({ data_recebimento: editDateVal })
        .eq("id", editingDate.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Data de recebimento atualizada.");
      qc.invalidateQueries({ queryKey: ["receivables"] });
      setEditingDate(null);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contas a Receber"
        description={contractFilter ? "Parcelas do contrato selecionado." : "Parcelas de todos os contratos."}
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <SummaryCard label="Previsto"  value={totals.previsto} />
        <SummaryCard label="Recebido"  value={totals.recebido} variant="success" />
        <SummaryCard label="Em aberto" value={totals.aberto} />
        <SummaryCard label="Vencido"   value={totals.vencido} variant="danger" />
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label>Filtrar por status</Label>
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">Todos</option>
            <option value="pendente">Pendente</option>
            <option value="parcial">Parcial</option>
            <option value="pago">Pago</option>
            <option value="vencido">Vencido</option>
          </Select>
        </div>
        <MonthFilter value={monthFilter} onChange={setMonthFilter} label="Vencimento (mês)" />
      </div>

      <DataTable<ReceivableRow>
        loading={isLoading}
        rows={filtered}
        columns={[
          { key: "empresa", header: "Empresa / Serviço", cell: (r) => (
            <div>
              <div className="font-semibold text-navy">{r.companies?.razao_social ?? "—"}</div>
              <div className="text-xs text-muted-foreground">{r.contracts?.servico ?? "—"}</div>
            </div>
          )},
          { key: "parcela", header: "Parcela", cell: (r) => `${r.numero_parcela}/${r.total_parcelas}` },
          { key: "prevista", header: "Vencimento", cell: (r) => formatDate(r.data_prevista) },
          { key: "recebimento", header: "Recebimento", cell: (r) => (
            <div className="flex items-center gap-1">
              <span>{r.data_recebimento ? formatDate(r.data_recebimento) : "—"}</span>
              {r.data_recebimento && (
                <button
                  title="Editar data de recebimento"
                  className="text-muted-foreground hover:text-navy"
                  onClick={() => { setEditingDate(r); setEditDateVal(r.data_recebimento!); }}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )},
          { key: "valor", header: "Previsto", cell: (r) => formatMoney(r.valor_previsto), className: "text-right" },
          { key: "recebido", header: "Recebido", cell: (r) => formatMoney(r.valor_recebido), className: "text-right" },
          { key: "status", header: "Status", cell: (r) => <StatusBadge kind="receivable" value={r.status} /> },
          { key: "acoes", header: "", className: "w-32 text-right", cell: (r) => (
            r.status !== "pago" && (
              <Button size="sm" variant="primary" onClick={() => openPayment(r)}>
                <CheckCircle2 className="h-4 w-4" /> Receber
              </Button>
            )
          )},
        ]}
      />

      <Dialog open={!!paying} onOpenChange={(o) => !o && setPaying(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar recebimento</DialogTitle>
            {paying && (
              <DialogDescription>
                {paying.companies?.razao_social} — Parcela {paying.numero_parcela}/{paying.total_parcelas} — previsto {formatMoney(paying.valor_previsto)}
              </DialogDescription>
            )}
          </DialogHeader>
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); pay.mutate(); }}>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Valor recebido *</Label>
                <Input
                  type="number" step="0.01" min="0.01" required
                  value={payValue} onChange={(e) => setPayValue(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Data *</Label>
                <Input type="date" required value={payDate} onChange={(e) => setPayDate(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Forma de pagamento</Label>
              <Select value={payForm} onChange={(e) => setPayForm(e.target.value)}>
                <option>PIX</option>
                <option>Transferência</option>
                <option>Boleto</option>
                <option>Cartão</option>
                <option>Dinheiro</option>
                <option>Outro</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Observações</Label>
              <Textarea value={payNotes} onChange={(e) => setPayNotes(e.target.value)} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPaying(null)}>Cancelar</Button>
              <Button type="submit" variant="primary" disabled={pay.isPending}>
                {pay.isPending ? "Salvando…" : "Confirmar recebimento"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingDate} onOpenChange={(o) => !o && setEditingDate(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Alterar data de recebimento</DialogTitle>
            {editingDate && (
              <DialogDescription>
                {editingDate.companies?.razao_social} — Parcela {editingDate.numero_parcela}/{editingDate.total_parcelas}
              </DialogDescription>
            )}
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => { e.preventDefault(); updateDate.mutate(); }}
          >
            <div className="space-y-1.5">
              <Label>Nova data de recebimento *</Label>
              <Input
                type="date"
                required
                value={editDateVal}
                onChange={(e) => setEditDateVal(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditingDate(null)}>Cancelar</Button>
              <Button type="submit" variant="primary" disabled={updateDate.isPending}>
                {updateDate.isPending ? "Salvando…" : "Atualizar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SummaryCard({
  label, value, variant,
}: { label: string; value: number; variant?: "success" | "danger" }) {
  const color = variant === "success" ? "text-success" : variant === "danger" ? "text-destructive" : "text-navy";
  return (
    <div className="rounded-lg border border-border bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-1 font-display text-2xl font-bold ${color}`}>{formatMoney(value)}</p>
    </div>
  );
}
