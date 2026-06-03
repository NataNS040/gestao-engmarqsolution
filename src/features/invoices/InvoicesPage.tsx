import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FileText } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatMoney, formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { PageHeader, DataTable } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { MonthFilter, matchesMonth } from "@/components/shared/MonthFilter";

interface InvoiceRow {
  id: string;
  contract_id: string;
  receivable_id: string | null;
  company_id: string;
  numero_nf: string | null;
  data_emissao: string | null;
  valor: number;
  status: "emitida" | "nao_emitida";
  observacoes: string | null;
  companies: { razao_social: string } | null;
  contracts: { servico: string } | null;
  receivables: { numero_parcela: number; total_parcelas: number } | null;
}

export default function InvoicesPage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("");
  const [monthFilter, setMonthFilter] = useState("");
  const [emitting, setEmitting] = useState<InvoiceRow | null>(null);
  const [numero, setNumero] = useState("");
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [obs, setObs] = useState("");

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["invoices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("*, companies(razao_social), contracts(servico), receivables(numero_parcela, total_parcelas)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return ((data ?? []) as unknown) as InvoiceRow[];
    },
  });

  const filtered = useMemo(
    () => rows.filter((r) =>
      (statusFilter ? r.status === statusFilter : true) &&
      matchesMonth(r.data_emissao, monthFilter)
    ),
    [rows, statusFilter, monthFilter]
  );

  const totals = rows.reduce(
    (acc, r) => {
      if (r.status === "emitida") { acc.emitidas++; acc.valorEmit += Number(r.valor); }
      else { acc.pendentes++; acc.valorPend += Number(r.valor); }
      return acc;
    },
    { emitidas: 0, pendentes: 0, valorEmit: 0, valorPend: 0 }
  );

  function openEmit(r: InvoiceRow) {
    setEmitting(r);
    setNumero(r.numero_nf ?? "");
    setData(r.data_emissao ?? new Date().toISOString().slice(0, 10));
    setObs(r.observacoes ?? "");
  }

  const emit = useMutation({
    mutationFn: async () => {
      if (!emitting) return;
      const { error } = await supabase.from("invoices").update({
        numero_nf: numero || null,
        data_emissao: data,
        observacoes: obs || null,
        status: "emitida",
      }).eq("id", emitting.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Nota fiscal marcada como emitida.");
      qc.invalidateQueries({ queryKey: ["invoices"] });
      setEmitting(null);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  const revert = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("invoices").update({
        status: "nao_emitida", numero_nf: null, data_emissao: null,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Status revertido.");
      qc.invalidateQueries({ queryKey: ["invoices"] });
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notas Fiscais"
        description="Controle de emissão (manual)."
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Summary label="Emitidas" value={totals.emitidas} format="int" tone="success" />
        <Summary label="Valor emitido" value={totals.valorEmit} format="money" tone="success" />
        <Summary label="Pendentes" value={totals.pendentes} format="int" />
        <Summary label="Valor pendente" value={totals.valorPend} format="money" />
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label>Filtrar</Label>
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">Todas</option>
            <option value="nao_emitida">Pendentes</option>
            <option value="emitida">Emitidas</option>
          </Select>
        </div>
        <MonthFilter value={monthFilter} onChange={setMonthFilter} label="Emissão (mês)" />
      </div>

      <DataTable<InvoiceRow>
        loading={isLoading}
        rows={filtered}
        columns={[
          { key: "empresa", header: "Empresa / Serviço", cell: (r) => (
            <div>
              <div className="font-semibold text-navy">{r.companies?.razao_social ?? "—"}</div>
              <div className="text-xs text-muted-foreground">{r.contracts?.servico ?? "—"}</div>
            </div>
          )},
          { key: "parcela", header: "Parcela", cell: (r) =>
            r.receivables ? `${r.receivables.numero_parcela}/${r.receivables.total_parcelas}` : "—" },
          { key: "valor", header: "Valor", cell: (r) => formatMoney(r.valor), className: "text-right" },
          { key: "numero", header: "Nº NF", cell: (r) => r.numero_nf ?? "—" },
          { key: "data", header: "Emissão", cell: (r) => formatDate(r.data_emissao) },
          { key: "status", header: "Status", cell: (r) => <StatusBadge kind="invoice" value={r.status} /> },
          { key: "acoes", header: "", className: "w-40 text-right", cell: (r) => (
            r.status === "nao_emitida" ? (
              <Button size="sm" variant="primary" onClick={() => openEmit(r)}>
                <FileText className="h-4 w-4" /> Marcar emitida
              </Button>
            ) : (
              <Button size="sm" variant="ghost" onClick={() => revert.mutate(r.id)}>
                Reverter
              </Button>
            )
          )},
        ]}
      />

      <Dialog open={!!emitting} onOpenChange={(o) => !o && setEmitting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Marcar nota como emitida</DialogTitle>
            {emitting && (
              <DialogDescription>
                {emitting.companies?.razao_social} — {formatMoney(emitting.valor)}
              </DialogDescription>
            )}
          </DialogHeader>
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); emit.mutate(); }}>
            <div className="space-y-1.5">
              <Label>Número da NF *</Label>
              <Input required value={numero} onChange={(e) => setNumero(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Data de emissão *</Label>
              <Input type="date" required value={data} onChange={(e) => setData(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Observações</Label>
              <Textarea value={obs} onChange={(e) => setObs(e.target.value)} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEmitting(null)}>Cancelar</Button>
              <Button type="submit" variant="primary" disabled={emit.isPending}>
                {emit.isPending ? "Salvando…" : "Confirmar emissão"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Summary({
  label, value, format, tone,
}: { label: string; value: number; format: "money" | "int"; tone?: "success" | "danger" }) {
  const color = tone === "success" ? "text-success" : tone === "danger" ? "text-destructive" : "text-navy";
  return (
    <div className="rounded-lg border border-border bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-1 font-display text-2xl font-bold ${color}`}>
        {format === "money" ? formatMoney(value) : value}
      </p>
    </div>
  );
}
