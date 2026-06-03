import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Eye, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/features/auth/AuthContext";
import { can } from "@/lib/permissions";
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

interface Contract {
  id: string;
  company_id: string;
  vendedor_id: string;
  servico: string;
  valor_bruto: number;
  percentual_imposto_snapshot: number;
  valor_imposto: number;
  valor_liquido: number;
  data_venda: string;
  data_inicio: string | null;
  data_conclusao_prevista: string | null;
  status: "em_andamento" | "concluido" | "cancelado";
  forma_pagamento: "a_vista" | "50_50" | "2x" | "3x" | "12x" | "personalizado";
  modelo_emissao_nf: "por_parcela" | "encerramento";
  parcelas_personalizadas: { valor: number; data: string }[] | null;
  observacoes: string | null;
  created_at: string;
}

interface ContractRow extends Contract {
  companies: { razao_social: string } | null;
  sellers: { nome: string } | null;
}

interface FormState {
  id?: string;
  company_id: string;
  vendedor_id: string;
  servico: string;
  valor_bruto: number;
  percentual_imposto_snapshot: number;
  data_venda: string;
  data_inicio: string;
  data_conclusao_prevista: string;
  status: Contract["status"];
  forma_pagamento: Contract["forma_pagamento"];
  modelo_emissao_nf: Contract["modelo_emissao_nf"];
  parcelas_personalizadas: { valor: number; data: string }[];
  observacoes: string;
}

const today = () => new Date().toISOString().slice(0, 10);

function emptyForm(taxDefault: number): FormState {
  return {
    company_id: "", vendedor_id: "", servico: "",
    valor_bruto: 0, percentual_imposto_snapshot: taxDefault,
    data_venda: today(), data_inicio: today(), data_conclusao_prevista: "",
    status: "em_andamento", forma_pagamento: "a_vista", modelo_emissao_nf: "por_parcela",
    parcelas_personalizadas: [], observacoes: "",
  };
}

/** Espelha exatamente a lógica de generate_receivables() do banco para preview. */
function previewParcels(form: FormState) {
  const base = form.data_inicio || form.data_venda;
  const addDays = (d: string, days: number) => {
    const dt = new Date(d + "T00:00:00");
    dt.setDate(dt.getDate() + days);
    return dt.toISOString().slice(0, 10);
  };
  const round2 = (n: number) => Math.round(n * 100) / 100;

  if (!form.valor_bruto || form.valor_bruto <= 0) return [];

  switch (form.forma_pagamento) {
    case "a_vista":
      return [{ n: 1, total: 1, valor: form.valor_bruto, data: base }];
    case "50_50": {
      const v1 = round2(form.valor_bruto / 2);
      const v2 = round2(form.valor_bruto - v1);
      return [
        { n: 1, total: 2, valor: v1, data: base },
        { n: 2, total: 2, valor: v2, data: addDays(base, 30) },
      ];
    }
    case "2x":
    case "3x":
    case "12x": {
      const total = form.forma_pagamento === "2x" ? 2 : form.forma_pagamento === "3x" ? 3 : 12;
      const v = round2(form.valor_bruto / total);
      const last = round2(form.valor_bruto - v * (total - 1));
      return Array.from({ length: total }, (_, i) => ({
        n: i + 1, total,
        valor: i === total - 1 ? last : v,
        data: addDays(base, i * 30),
      }));
    }
    case "personalizado":
      return form.parcelas_personalizadas.map((p, i) => ({
        n: i + 1, total: form.parcelas_personalizadas.length,
        valor: p.valor, data: p.data,
      }));
  }
}

export default function ContractsPage() {
  const { profile } = useAuth();
  const role = profile?.role ?? "comercial";
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState | null>(null);
  const [monthFilter, setMonthFilter] = useState("");

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["contracts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contracts")
        .select("*, companies(razao_social), sellers(nome)")
        .order("data_venda", { ascending: false });
      if (error) throw error;
      return ((data ?? []) as unknown) as ContractRow[];
    },
  });

  const { data: companies = [] } = useQuery({
    queryKey: ["companies", "min"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies").select("id, razao_social").order("razao_social");
      if (error) throw error;
      return data as { id: string; razao_social: string }[];
    },
  });

  const { data: sellers = [] } = useQuery({
    queryKey: ["sellers", "ativos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sellers").select("id, nome").eq("status", "ativo").order("nome");
      if (error) throw error;
      return data as { id: string; nome: string }[];
    },
  });

  const { data: taxActive } = useQuery({
    queryKey: ["tax_settings", "active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tax_settings").select("percentual").is("vigencia_fim", null).maybeSingle();
      if (error) throw error;
      return (data?.percentual ?? 0) as number;
    },
  });

  function openNew() {
    setForm(emptyForm(Number(taxActive ?? 0)));
    setOpen(true);
  }

  const create = useMutation({
    mutationFn: async (f: FormState) => {
      const { error } = await supabase.from("contracts").insert({
        company_id: f.company_id,
        vendedor_id: f.vendedor_id,
        servico: f.servico,
        valor_bruto: f.valor_bruto,
        percentual_imposto_snapshot: f.percentual_imposto_snapshot,
        data_venda: f.data_venda,
        data_inicio: f.data_inicio || null,
        data_conclusao_prevista: f.data_conclusao_prevista || null,
        status: f.status,
        forma_pagamento: f.forma_pagamento,
        modelo_emissao_nf: f.modelo_emissao_nf,
        parcelas_personalizadas:
          f.forma_pagamento === "personalizado" ? f.parcelas_personalizadas : null,
        observacoes: f.observacoes || null,
        created_by: profile?.id,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Contrato cadastrado e parcelas geradas.");
      qc.invalidateQueries({ queryKey: ["contracts"] });
      qc.invalidateQueries({ queryKey: ["receivables"] });
      setOpen(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao salvar"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("contracts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Contrato removido.");
      qc.invalidateQueries({ queryKey: ["contracts"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contratos"
        description="Vendas realizadas. Parcelas são geradas automaticamente."
        actions={can(role, "create", "contracts") && (
          <Button onClick={openNew}><Plus className="h-4 w-4" /> Novo contrato</Button>
        )}
      />

      <div className="flex flex-wrap items-end gap-3">
        <MonthFilter value={monthFilter} onChange={setMonthFilter} label="Venda (mês)" />
      </div>

      <DataTable<ContractRow>
        loading={isLoading}
        rows={rows.filter((r) => matchesMonth(r.data_venda, monthFilter))}
        columns={[
          { key: "empresa", header: "Empresa", cell: (r) => (
            <div>
              <div className="font-semibold text-navy">{r.companies?.razao_social ?? "—"}</div>
              <div className="text-xs text-muted-foreground">{r.servico}</div>
            </div>
          )},
          { key: "vendedor", header: "Vendedor", cell: (r) => r.sellers?.nome ?? "—" },
          { key: "data", header: "Venda", cell: (r) => formatDate(r.data_venda) },
          { key: "bruto", header: "Bruto", cell: (r) => formatMoney(r.valor_bruto), className: "text-right" },
          { key: "imp", header: "Imposto", cell: (r) => `${r.percentual_imposto_snapshot}%`, className: "text-right" },
          { key: "liq", header: "Líquido", cell: (r) => <span className="font-semibold text-navy">{formatMoney(r.valor_liquido)}</span>, className: "text-right" },
          { key: "fp", header: "Pagto", cell: (r) => r.forma_pagamento.replace("_", "/") },
          { key: "status", header: "Status", cell: (r) => <StatusBadge kind="contract" value={r.status} /> },
          { key: "acoes", header: "", className: "w-20 text-right", cell: (r) => (
            <div className="flex justify-end gap-1">
              <a href={`/receber?contrato=${r.id}`} title="Ver parcelas">
                <Button size="icon" variant="ghost"><Eye className="h-4 w-4" /></Button>
              </a>
              {can(role, "delete", "contracts") && (
                <Button
                  size="icon" variant="ghost"
                  onClick={() => confirm("Remover contrato e suas parcelas?") && remove.mutate(r.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </div>
          )},
        ]}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Novo contrato</DialogTitle>
            <DialogDescription>
              O percentual de imposto vigente ({Number(taxActive ?? 0)}%) será gravado como snapshot.
            </DialogDescription>
          </DialogHeader>
          {form && (
            <ContractForm
              form={form}
              setForm={setForm}
              companies={companies}
              sellers={sellers}
              onCancel={() => setOpen(false)}
              onSubmit={() => create.mutate(form)}
              saving={create.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ContractForm({
  form, setForm, companies, sellers, onCancel, onSubmit, saving,
}: {
  form: FormState;
  setForm: (f: FormState) => void;
  companies: { id: string; razao_social: string }[];
  sellers: { id: string; nome: string }[];
  onCancel: () => void;
  onSubmit: () => void;
  saving: boolean;
}) {
  const parcels = useMemo(() => previewParcels(form), [form]);
  const valorImposto = +(form.valor_bruto * form.percentual_imposto_snapshot / 100).toFixed(2);
  const valorLiquido = +(form.valor_bruto - valorImposto).toFixed(2);

  // Mantém a soma das parcelas personalizadas sincronizada com novo bruto, se array vazio.
  useEffect(() => {
    if (form.forma_pagamento === "personalizado" && form.parcelas_personalizadas.length === 0) {
      setForm({ ...form, parcelas_personalizadas: [{ valor: form.valor_bruto, data: form.data_inicio || form.data_venda }] });
    }
  }, [form.forma_pagamento]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Empresa *</Label>
          <Select required value={form.company_id} onChange={(e) => setForm({ ...form, company_id: e.target.value })}>
            <option value="">Selecione…</option>
            {companies.map((c) => <option key={c.id} value={c.id}>{c.razao_social}</option>)}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Vendedor *</Label>
          <Select required value={form.vendedor_id} onChange={(e) => setForm({ ...form, vendedor_id: e.target.value })}>
            <option value="">Selecione…</option>
            {sellers.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
          </Select>
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Serviço vendido *</Label>
          <Input required value={form.servico} onChange={(e) => setForm({ ...form, servico: e.target.value })} />
        </div>

        <div className="space-y-1.5">
          <Label>Valor bruto *</Label>
          <Input
            type="number" step="0.01" min="0" required
            value={form.valor_bruto || ""}
            onChange={(e) => setForm({ ...form, valor_bruto: Number(e.target.value) })}
          />
        </div>
        <div className="space-y-1.5">
          <Label>% imposto (snapshot)</Label>
          <Input
            type="number" step="0.01" min="0" max="100"
            value={form.percentual_imposto_snapshot}
            onChange={(e) => setForm({ ...form, percentual_imposto_snapshot: Number(e.target.value) })}
          />
        </div>

        <div className="space-y-1.5">
          <Label>Data da venda *</Label>
          <Input type="date" required value={form.data_venda} onChange={(e) => setForm({ ...form, data_venda: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Início do serviço</Label>
          <Input type="date" value={form.data_inicio} onChange={(e) => setForm({ ...form, data_inicio: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Conclusão prevista</Label>
          <Input type="date" value={form.data_conclusao_prevista} onChange={(e) => setForm({ ...form, data_conclusao_prevista: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Status</Label>
          <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Contract["status"] })}>
            <option value="em_andamento">Em andamento</option>
            <option value="concluido">Concluído</option>
            <option value="cancelado">Cancelado</option>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Forma de pagamento *</Label>
          <Select value={form.forma_pagamento} onChange={(e) => setForm({ ...form, forma_pagamento: e.target.value as Contract["forma_pagamento"] })}>
            <option value="a_vista">À vista</option>
            <option value="50_50">50/50</option>
            <option value="2x">2 parcelas</option>
            <option value="3x">3 parcelas</option>
            <option value="12x">Assessoria (12x mensal)</option>
            <option value="personalizado">Personalizado</option>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Emissão de NF</Label>
          <Select value={form.modelo_emissao_nf} onChange={(e) => setForm({ ...form, modelo_emissao_nf: e.target.value as Contract["modelo_emissao_nf"] })}>
            <option value="por_parcela">Uma NF por parcela</option>
            <option value="encerramento">NF única no encerramento</option>
          </Select>
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label>Observações</Label>
          <Textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
        </div>
      </div>

      {/* Painel de cálculo */}
      <div className="rounded-lg border-2 border-navy/15 bg-navy/5 p-4">
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-xs uppercase text-muted-foreground">Bruto</p>
            <p className="font-display text-xl font-bold text-navy">{formatMoney(form.valor_bruto)}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-muted-foreground">Imposto ({form.percentual_imposto_snapshot}%)</p>
            <p className="font-display text-xl font-bold text-destructive">− {formatMoney(valorImposto)}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-muted-foreground">Líquido</p>
            <p className="font-display text-xl font-bold text-success">{formatMoney(valorLiquido)}</p>
          </div>
        </div>
      </div>

      {/* Parcelas personalizadas (editor) */}
      {form.forma_pagamento === "personalizado" && (
        <div className="space-y-2 rounded-lg border border-border p-4">
          <div className="flex items-center justify-between">
            <Label>Parcelas personalizadas</Label>
            <Button type="button" size="sm" variant="ghost"
              onClick={() => setForm({ ...form, parcelas_personalizadas: [...form.parcelas_personalizadas, { valor: 0, data: today() }] })}
            >+ adicionar</Button>
          </div>
          {form.parcelas_personalizadas.map((p, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-8 text-sm font-semibold text-muted-foreground">{i + 1}.</span>
              <Input
                type="number" step="0.01" min="0" placeholder="Valor" className="flex-1"
                value={p.valor || ""}
                onChange={(e) => {
                  const arr = [...form.parcelas_personalizadas];
                  arr[i] = { ...arr[i], valor: Number(e.target.value) };
                  setForm({ ...form, parcelas_personalizadas: arr });
                }}
              />
              <Input
                type="date" className="flex-1" value={p.data}
                onChange={(e) => {
                  const arr = [...form.parcelas_personalizadas];
                  arr[i] = { ...arr[i], data: e.target.value };
                  setForm({ ...form, parcelas_personalizadas: arr });
                }}
              />
              <Button type="button" size="icon" variant="ghost"
                onClick={() => setForm({ ...form, parcelas_personalizadas: form.parcelas_personalizadas.filter((_, idx) => idx !== i) })}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Preview parcelas */}
      {parcels.length > 0 && (
        <div className="rounded-lg border border-border p-4">
          <p className="mb-2 text-sm font-semibold text-navy">Parcelas que serão geradas ({parcels.length})</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {parcels.map((p) => (
              <div key={p.n} className="rounded-md bg-muted px-3 py-2 text-sm">
                <div className="text-xs text-muted-foreground">Parcela {p.n}/{p.total}</div>
                <div className="font-semibold text-navy">{formatMoney(p.valor)}</div>
                <div className="text-xs">{formatDate(p.data)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" variant="primary" disabled={saving}>
          {saving ? "Salvando…" : "Salvar contrato"}
        </Button>
      </DialogFooter>
    </form>
  );
}
