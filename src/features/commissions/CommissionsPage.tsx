import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Calculator, CheckCircle2, History, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/features/auth/AuthContext";
import { formatMoney, formatDate, formatPercent } from "@/lib/format";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface SellerLite { id: string; nome: string }

interface CommissionCalc {
  id: string;
  vendedor_id: string;
  periodo_inicio: string;
  periodo_fim: string;
  total_vendido: number;
  total_liquido: number;
  comissao_calculada: number;
  status: "pendente" | "pago";
  detalhamento: PreviewResult;
  criado_em: string;
  sellers: { nome: string } | null;
}

interface FaixaSlice { faixa: number; base: number; percentual: number; comissao: number }
interface MonthDetail {
  mes: string;
  bruto_recebido: number;
  liquido_recebido: number;
  comissao: number;
  faixas: FaixaSlice[];
}
interface PreviewResult {
  vendedor_id: string;
  periodo_inicio: string;
  periodo_fim: string;
  total_bruto_recebido: number;
  total_liquido_recebido: number;
  comissao_total: number;
  meses: MonthDetail[];
}

type Periodo = "quinzena_1" | "quinzena_2" | "mes" | "personalizado";

function rangeFromPeriodo(periodo: Periodo, ref: string): { inicio: string; fim: string } {
  const [y, m] = ref.split("-").map(Number);
  const last = new Date(y, m, 0).getDate();
  const pad = (n: number) => String(n).padStart(2, "0");
  switch (periodo) {
    case "quinzena_1": return { inicio: `${y}-${pad(m)}-01`, fim: `${y}-${pad(m)}-15` };
    case "quinzena_2": return { inicio: `${y}-${pad(m)}-16`, fim: `${y}-${pad(m)}-${pad(last)}` };
    case "mes":        return { inicio: `${y}-${pad(m)}-01`, fim: `${y}-${pad(m)}-${pad(last)}` };
    case "personalizado": return { inicio: "", fim: "" };
  }
}

export default function CommissionsPage() {
  const { profile } = useAuth();
  const isFin = profile?.role === "admin" || profile?.role === "financeiro";
  const qc = useQueryClient();

  const refMonth = new Date().toISOString().slice(0, 7);
  const [periodo, setPeriodo] = useState<Periodo>("mes");
  const [ref, setRef] = useState(refMonth);
  const [vendedorId, setVendedorId] = useState("");
  const initial = rangeFromPeriodo("mes", refMonth);
  const [customInicio, setCustomInicio] = useState(initial.inicio);
  const [customFim, setCustomFim] = useState(initial.fim);

  const range = periodo === "personalizado"
    ? { inicio: customInicio, fim: customFim }
    : rangeFromPeriodo(periodo, ref);

  // Pagar
  const [paying, setPaying] = useState<CommissionCalc | null>(null);
  const [payValue, setPayValue] = useState("");
  const [payDate, setPayDate] = useState(new Date().toISOString().slice(0, 10));
  const [payCreateAp, setPayCreateAp] = useState(true);
  const [payObs, setPayObs] = useState("");
  // Histórico detalhado
  const [viewing, setViewing] = useState<CommissionCalc | null>(null);
  const [monthFilter, setMonthFilter] = useState("");

  const { data: sellers = [] } = useQuery({
    queryKey: ["sellers", "lite"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sellers").select("id, nome").eq("status", "ativo").order("nome");
      if (error) throw error;
      return (data ?? []) as SellerLite[];
    },
  });

  const { data: history = [], isLoading: loadingHist } = useQuery({
    queryKey: ["commissions", "history"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("commission_calculations")
        .select("*, sellers(nome)")
        .order("criado_em", { ascending: false });
      if (error) throw error;
      return ((data ?? []) as unknown) as CommissionCalc[];
    },
  });

  const preview = useMutation({
    mutationFn: async (): Promise<PreviewResult> => {
      if (!vendedorId || !range.inicio || !range.fim) throw new Error("Preencha vendedor e período");
      const { data, error } = await supabase.rpc("preview_commission", {
        p_vendedor_id: vendedorId, p_inicio: range.inicio, p_fim: range.fim,
      });
      if (error) throw error;
      return data as unknown as PreviewResult;
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  const close = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("close_commission", {
        p_vendedor_id: vendedorId, p_inicio: range.inicio, p_fim: range.fim,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Fechamento gravado.");
      qc.invalidateQueries({ queryKey: ["commissions", "history"] });
      preview.reset();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  const removeCalc = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("commission_calculations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Fechamento removido.");
      qc.invalidateQueries({ queryKey: ["commissions", "history"] });
      qc.invalidateQueries({ queryKey: ["payables"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  const pay = useMutation({
    mutationFn: async () => {
      if (!paying) return;
      const valor = Number(payValue);
      if (!Number.isFinite(valor) || valor <= 0) throw new Error("Valor inválido");

      let payable_id: string | null = null;
      if (payCreateAp) {
        const { data: cat } = await supabase
          .from("financial_categories").select("id").eq("nome", "Comissões").maybeSingle();
        const { data: ap, error: e1 } = await supabase.from("payables").insert({
          descricao: `Comissão ${paying.sellers?.nome ?? ""} — ${formatDate(paying.periodo_inicio)} a ${formatDate(paying.periodo_fim)}`,
          categoria_id: cat?.id ?? null,
          fornecedor: paying.sellers?.nome ?? null,
          valor, data_vencimento: payDate, data_pagamento: payDate,
          forma_pagamento: "Comissão",
          observacoes: payObs || null,
          created_by: profile?.id,
        }).select("id").single();
        if (e1) throw e1;
        if (!ap) throw new Error("Falha ao criar conta a pagar");
        payable_id = ap.id;
      }

      const { data: cp, error } = await supabase.from("commission_payments").insert({
        calculation_id: paying.id,
        valor_pago: valor,
        data_pagamento: payDate,
        responsavel_id: profile?.id,
        payable_id,
        observacoes: payObs || null,
      }).select("id").single();
      if (error) throw error;

      // Vincula a conta a pagar ao pagamento de comissão criado
      if (payable_id && cp?.id) {
        await supabase.from("payables").update({ commission_payment_id: cp.id }).eq("id", payable_id);
      }
    },
    onSuccess: () => {
      toast.success("Pagamento de comissão registrado.");
      qc.invalidateQueries({ queryKey: ["commissions", "history"] });
      qc.invalidateQueries({ queryKey: ["payables"] });
      setPaying(null);
    },
    onError: (e: unknown) => {
      const msg =
        e instanceof Error
          ? e.message
          : typeof e === "object" && e !== null && "message" in e
            ? String((e as { message: string }).message)
            : "Erro ao registrar pagamento de comissão";
      toast.error(msg);
    },
  });

  const filteredHistory = useMemo(() => {
    let list = history;
    if (profile?.role === "comercial" && profile.seller_id) {
      list = list.filter((h) => h.vendedor_id === profile.seller_id);
    }
    if (monthFilter) {
      list = list.filter((h) => matchesMonth(h.periodo_inicio, monthFilter));
    }
    return list;
  }, [history, profile, monthFilter]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Comissões"
        description="Faixas progressivas 8% até R$ 30k · 9% até R$ 45k · 10% acima. Base: valor líquido recebido no mês."
      />

      {isFin && (
        <Card>
          <CardHeader>
            <CardTitle>Fechamento de comissão</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-5">
              <div className="space-y-1.5">
                <Label>Vendedor</Label>
                <Select value={vendedorId} onChange={(e) => setVendedorId(e.target.value)}>
                  <option value="">Selecione…</option>
                  {sellers.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Período</Label>
                <Select value={periodo} onChange={(e) => setPeriodo(e.target.value as Periodo)}>
                  <option value="mes">Mês cheio</option>
                  <option value="quinzena_1">1ª quinzena</option>
                  <option value="quinzena_2">2ª quinzena</option>
                  <option value="personalizado">Personalizado</option>
                </Select>
              </div>
              {periodo !== "personalizado" ? (
                <div className="space-y-1.5">
                  <Label>Mês de referência</Label>
                  <Input type="month" value={ref} onChange={(e) => setRef(e.target.value)} />
                </div>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <Label>Início</Label>
                    <Input type="date" value={customInicio} onChange={(e) => setCustomInicio(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Fim</Label>
                    <Input type="date" value={customFim} onChange={(e) => setCustomFim(e.target.value)} />
                  </div>
                </>
              )}
              <div className="flex items-end gap-2">
                <Button onClick={() => preview.mutate()} disabled={preview.isPending} variant="primary">
                  <Calculator className="h-4 w-4" /> Calcular
                </Button>
              </div>
            </div>

            {preview.data && <PreviewBlock data={preview.data} onClose={() => close.mutate()} closing={close.isPending} />}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Histórico de fechamentos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <MonthFilter value={monthFilter} onChange={setMonthFilter} label="Período (mês)" />
          </div>
          <DataTable<CommissionCalc>
            loading={loadingHist}
            rows={filteredHistory}
            columns={[
              { key: "vend",   header: "Vendedor",    cell: (r) => <span className="font-semibold text-navy">{r.sellers?.nome ?? "—"}</span> },
              { key: "per",    header: "Período",     cell: (r) => `${formatDate(r.periodo_inicio)} – ${formatDate(r.periodo_fim)}` },
              { key: "bruto",  header: "Recebido",    cell: (r) => formatMoney(r.total_vendido), className: "text-right" },
              { key: "liq",    header: "Líquido",     cell: (r) => formatMoney(r.total_liquido), className: "text-right" },
              { key: "com",    header: "Comissão",    cell: (r) => <span className="font-semibold text-amber-dark">{formatMoney(r.comissao_calculada)}</span>, className: "text-right" },
              { key: "status", header: "Status",      cell: (r) => <StatusBadge kind="commission" value={r.status} /> },
              { key: "criado", header: "Fechado em",  cell: (r) => formatDate(r.criado_em) },
              { key: "acoes",  header: "",            className: "w-44 text-right", cell: (r) => (
                <div className="flex justify-end gap-1">
                  <Button size="icon" variant="ghost" onClick={() => setViewing(r)} title="Ver detalhamento">
                    <History className="h-4 w-4" />
                  </Button>
                  {isFin && r.status === "pendente" && (
                    <Button size="sm" variant="primary"
                      onClick={() => {
                        setPaying(r);
                        setPayValue(String(r.comissao_calculada.toFixed(2)));
                        setPayDate(new Date().toISOString().slice(0, 10));
                        setPayCreateAp(true); setPayObs("");
                      }}>
                      <CheckCircle2 className="h-4 w-4" /> Pagar
                    </Button>
                  )}
                  {isFin && r.status === "pendente" && (
                    <Button
                      size="icon" variant="ghost" title="Excluir fechamento"
                      onClick={() =>
                        confirm("Excluir este fechamento de comissão? Pagamentos vinculados serão removidos.") &&
                        removeCalc.mutate(r.id)
                      }
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              )},
            ]}
          />
        </CardContent>
      </Card>

      {/* Dialog: pagamento */}
      <Dialog open={!!paying} onOpenChange={(o) => !o && setPaying(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pagar comissão</DialogTitle>
            {paying && (
              <DialogDescription>
                {paying.sellers?.nome} — {formatDate(paying.periodo_inicio)} a {formatDate(paying.periodo_fim)} — calculada {formatMoney(paying.comissao_calculada)}
              </DialogDescription>
            )}
          </DialogHeader>
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); pay.mutate(); }}>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Valor pago *</Label>
                <Input type="number" step="0.01" min="0.01" required value={payValue} onChange={(e) => setPayValue(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Data *</Label>
                <Input type="date" required value={payDate} onChange={(e) => setPayDate(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Observações</Label>
              <Textarea value={payObs} onChange={(e) => setPayObs(e.target.value)} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={payCreateAp} onChange={(e) => setPayCreateAp(e.target.checked)} />
              Gerar Conta a Pagar vinculada (categoria Comissões)
            </label>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPaying(null)}>Cancelar</Button>
              <Button type="submit" variant="primary" disabled={pay.isPending}>
                {pay.isPending ? "Salvando…" : "Confirmar pagamento"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: detalhamento */}
      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Detalhamento do fechamento</DialogTitle>
            {viewing && (
              <DialogDescription>
                {viewing.sellers?.nome} — {formatDate(viewing.periodo_inicio)} a {formatDate(viewing.periodo_fim)}
              </DialogDescription>
            )}
          </DialogHeader>
          {viewing && <PreviewBlock data={viewing.detalhamento} readOnly />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PreviewBlock({
  data, onClose, closing, readOnly,
}: { data: PreviewResult; onClose?: () => void; closing?: boolean; readOnly?: boolean }) {
  return (
    <div className="space-y-4 rounded-lg border-2 border-navy/15 bg-navy/5 p-5">
      <div className="grid grid-cols-3 gap-4">
        <Kpi label="Recebido bruto" value={formatMoney(data.total_bruto_recebido)} />
        <Kpi label="Recebido líquido" value={formatMoney(data.total_liquido_recebido)} />
        <Kpi label="Comissão total" value={formatMoney(data.comissao_total)} tone="amber" />
      </div>

      {data.meses?.length > 0 ? (
        data.meses.map((m) => (
          <div key={m.mes} className="rounded-md border border-border bg-white p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase text-muted-foreground">Mês {m.mes}</p>
                <p className="font-display text-lg font-bold text-navy">{formatMoney(m.comissao)}</p>
              </div>
              <p className="text-xs text-muted-foreground">
                líquido recebido: <span className="font-semibold text-navy">{formatMoney(m.liquido_recebido)}</span>
              </p>
            </div>
            <table className="mt-2 w-full text-xs">
              <thead className="text-left text-muted-foreground">
                <tr><th>Faixa</th><th className="text-right">Base</th><th className="text-right">%</th><th className="text-right">Comissão</th></tr>
              </thead>
              <tbody>
                {m.faixas?.map((f, i) => (
                  <tr key={i}>
                    <td>Faixa {f.faixa}</td>
                    <td className="text-right">{formatMoney(f.base)}</td>
                    <td className="text-right">{formatPercent(f.percentual)}</td>
                    <td className="text-right font-semibold text-amber-dark">{formatMoney(f.comissao)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))
      ) : (
        <p className="text-sm text-muted-foreground">Nenhum recebimento no período.</p>
      )}

      {!readOnly && onClose && (
        <div className="flex justify-end">
          <Button variant="primary" onClick={onClose} disabled={closing || !data.comissao_total}>
            {closing ? "Salvando…" : "Salvar fechamento"}
          </Button>
        </div>
      )}
    </div>
  );
}

function Kpi({ label, value, tone }: { label: string; value: string; tone?: "amber" }) {
  const color = tone === "amber" ? "text-amber-dark" : "text-navy";
  return (
    <div>
      <p className="text-xs uppercase text-muted-foreground">{label}</p>
      <p className={`font-display text-xl font-bold ${color}`}>{value}</p>
    </div>
  );
}
