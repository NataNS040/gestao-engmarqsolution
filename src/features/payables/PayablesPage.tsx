import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/features/auth/AuthContext";
import { formatMoney, formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { PageHeader, DataTable } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";

interface Payable {
  id: string;
  descricao: string;
  categoria_id: number | null;
  fornecedor: string | null;
  valor: number;
  data_vencimento: string;
  data_pagamento: string | null;
  forma_pagamento: string | null;
  status: "pendente" | "pago" | "vencido";
  observacoes: string | null;
  financial_categories: { nome: string } | null;
}

interface Category { id: number; nome: string }

const empty: Partial<Payable> = {
  descricao: "", categoria_id: null, fornecedor: "", valor: 0,
  data_vencimento: new Date().toISOString().slice(0, 10),
  data_pagamento: null, forma_pagamento: "", observacoes: "",
};

export default function PayablesPage() {
  const { profile } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Payable> | null>(null);
  const [statusFilter, setStatusFilter] = useState("");

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["payables"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payables")
        .select("*, financial_categories(nome)")
        .order("data_vencimento");
      if (error) throw error;
      return ((data ?? []) as unknown) as Payable[];
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["financial_categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financial_categories").select("id, nome").eq("tipo", "despesa").order("nome");
      if (error) throw error;
      return (data ?? []) as Category[];
    },
  });

  const filtered = useMemo(
    () => (statusFilter ? rows.filter((r) => r.status === statusFilter) : rows),
    [rows, statusFilter]
  );

  const totals = rows.reduce(
    (acc, r) => {
      if (r.status === "pendente") acc.pendente += Number(r.valor);
      if (r.status === "vencido") acc.vencido += Number(r.valor);
      if (r.status === "pago") acc.pago += Number(r.valor);
      return acc;
    },
    { pendente: 0, vencido: 0, pago: 0 }
  );

  const upsert = useMutation({
    mutationFn: async (input: Partial<Payable>) => {
      const payload = {
        ...input,
        valor: Number(input.valor),
        categoria_id: input.categoria_id || null,
        data_pagamento: input.data_pagamento || null,
        created_by: profile?.id,
      };
      delete (payload as Record<string, unknown>)["financial_categories"];
      if (input.id) {
        const { error } = await supabase.from("payables").update(payload).eq("id", input.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("payables").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Conta salva.");
      qc.invalidateQueries({ queryKey: ["payables"] });
      setOpen(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("payables").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Conta removida.");
      qc.invalidateQueries({ queryKey: ["payables"] });
    },
  });

  const markPaid = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("payables").update({
        data_pagamento: new Date().toISOString().slice(0, 10),
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Marcada como paga.");
      qc.invalidateQueries({ queryKey: ["payables"] });
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contas a Pagar"
        description="Despesas da empresa."
        actions={
          <Button onClick={() => { setEditing(empty); setOpen(true); }}>
            <Plus className="h-4 w-4" /> Nova conta
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Summary label="Pendente" value={totals.pendente} />
        <Summary label="Vencido"  value={totals.vencido} tone="danger" />
        <Summary label="Pago"     value={totals.pago} tone="success" />
      </div>

      <div className="flex items-end gap-3">
        <div className="space-y-1.5">
          <Label>Filtrar</Label>
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">Todas</option>
            <option value="pendente">Pendentes</option>
            <option value="vencido">Vencidas</option>
            <option value="pago">Pagas</option>
          </Select>
        </div>
      </div>

      <DataTable<Payable>
        loading={isLoading}
        rows={filtered}
        columns={[
          { key: "desc", header: "Descrição", cell: (r) => (
            <div>
              <div className="font-semibold text-navy">{r.descricao}</div>
              {r.fornecedor && <div className="text-xs text-muted-foreground">{r.fornecedor}</div>}
            </div>
          )},
          { key: "cat", header: "Categoria", cell: (r) => r.financial_categories?.nome ?? "—" },
          { key: "venc", header: "Vencimento", cell: (r) => formatDate(r.data_vencimento) },
          { key: "valor", header: "Valor", cell: (r) => formatMoney(r.valor), className: "text-right" },
          { key: "pgto", header: "Pago em", cell: (r) => formatDate(r.data_pagamento) },
          { key: "status", header: "Status", cell: (r) => <StatusBadge kind="payable" value={r.status} /> },
          { key: "acoes", header: "", className: "w-40 text-right", cell: (r) => (
            <div className="flex justify-end gap-1">
              {r.status !== "pago" && (
                <Button size="icon" variant="ghost" title="Marcar paga" onClick={() => markPaid.mutate(r.id)}>
                  <CheckCircle2 className="h-4 w-4 text-success" />
                </Button>
              )}
              <Button size="icon" variant="ghost" onClick={() => { setEditing(r); setOpen(true); }}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost"
                onClick={() => confirm("Remover esta conta?") && remove.mutate(r.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          )},
        ]}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Editar conta" : "Nova conta a pagar"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <form
              className="grid grid-cols-1 gap-4 sm:grid-cols-2"
              onSubmit={(e) => { e.preventDefault(); upsert.mutate(editing); }}
            >
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Descrição *</Label>
                <Input required value={editing.descricao ?? ""} onChange={(e) => setEditing({ ...editing, descricao: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Categoria</Label>
                <Select
                  value={editing.categoria_id ?? ""}
                  onChange={(e) => setEditing({ ...editing, categoria_id: e.target.value ? Number(e.target.value) : null })}
                >
                  <option value="">—</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Fornecedor</Label>
                <Input value={editing.fornecedor ?? ""} onChange={(e) => setEditing({ ...editing, fornecedor: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Valor *</Label>
                <Input type="number" step="0.01" min="0" required value={editing.valor || ""}
                  onChange={(e) => setEditing({ ...editing, valor: Number(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <Label>Vencimento *</Label>
                <Input type="date" required value={editing.data_vencimento ?? ""}
                  onChange={(e) => setEditing({ ...editing, data_vencimento: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Data de pagamento</Label>
                <Input type="date" value={editing.data_pagamento ?? ""}
                  onChange={(e) => setEditing({ ...editing, data_pagamento: e.target.value || null })} />
              </div>
              <div className="space-y-1.5">
                <Label>Forma de pagamento</Label>
                <Input value={editing.forma_pagamento ?? ""}
                  onChange={(e) => setEditing({ ...editing, forma_pagamento: e.target.value })} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Observações</Label>
                <Textarea value={editing.observacoes ?? ""}
                  onChange={(e) => setEditing({ ...editing, observacoes: e.target.value })} />
              </div>
              <DialogFooter className="sm:col-span-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button type="submit" variant="primary" disabled={upsert.isPending}>
                  {upsert.isPending ? "Salvando…" : "Salvar"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Summary({ label, value, tone }: { label: string; value: number; tone?: "success" | "danger" }) {
  const color = tone === "success" ? "text-success" : tone === "danger" ? "text-destructive" : "text-navy";
  return (
    <div className="rounded-lg border border-border bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-1 font-display text-2xl font-bold ${color}`}>{formatMoney(value)}</p>
    </div>
  );
}
