import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, FileText, FileSpreadsheet } from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "@/lib/supabase";
import { formatMoney, formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader, DataTable } from "@/components/shared/PageHeader";

type ReportType = "receivables" | "payables" | "contracts" | "commissions";

interface Row { [k: string]: unknown }
interface ColumnSpec { key: string; header: string; format?: (v: unknown, row: Row) => string }

const REPORTS: Record<ReportType, { label: string; description: string }> = {
  receivables: { label: "Contas a Receber", description: "Parcelas previstas e recebidas no período." },
  payables:    { label: "Contas a Pagar",   description: "Despesas com vencimento no período." },
  contracts:   { label: "Contratos",        description: "Contratos assinados no período." },
  commissions: { label: "Comissões",        description: "Fechamentos de comissão do período." },
};

export default function ReportsPage() {
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
  const lastOfMonth  = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().slice(0, 10);

  const [type, setType] = useState<ReportType>("receivables");
  const [inicio, setInicio] = useState(firstOfMonth);
  const [fim, setFim] = useState(lastOfMonth);

  const { data: rows = [], isFetching, refetch } = useQuery({
    queryKey: ["report", type, inicio, fim],
    enabled: false,
    queryFn: async () => fetchReport(type, inicio, fim),
  });

  const cols = useMemo(() => columnsFor(type), [type]);

  const totals = useMemo(() => computeTotals(type, rows), [type, rows]);

  function exportExcel() {
    const data = rows.map((r) => Object.fromEntries(cols.map((c) => [c.header, c.format ? c.format(r[c.key], r) : r[c.key] ?? ""])));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, REPORTS[type].label.slice(0, 31));
    XLSX.writeFile(wb, `${type}_${inicio}_${fim}.xlsx`);
  }

  function exportPDF() {
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(16);
    doc.setTextColor(26, 54, 93);
    doc.text(`EngMarq Solution — ${REPORTS[type].label}`, 14, 15);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Período: ${formatDate(inicio)} a ${formatDate(fim)}   Gerado em ${formatDate(new Date())}`, 14, 22);

    autoTable(doc, {
      startY: 28,
      head: [cols.map((c) => c.header)],
      body: rows.map((r) => cols.map((c) => (c.format ? c.format(r[c.key], r) : String(r[c.key] ?? "")))),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [26, 54, 93], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 247, 250] },
    });

    const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
    if (totals.length > 0) {
      doc.setFontSize(10);
      doc.setTextColor(26, 54, 93);
      let y = finalY + 8;
      for (const t of totals) {
        doc.text(`${t.label}: ${t.value}`, 14, y);
        y += 6;
      }
    }

    doc.save(`${type}_${inicio}_${fim}.pdf`);
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Relatórios" description="Geração de relatórios financeiros em PDF e Excel." />

      <Card>
        <CardHeader><CardTitle>Parâmetros</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-5">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Relatório</Label>
              <Select value={type} onChange={(e) => setType(e.target.value as ReportType)}>
                {Object.entries(REPORTS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </Select>
              <p className="text-xs text-muted-foreground">{REPORTS[type].description}</p>
            </div>
            <div className="space-y-1.5">
              <Label>Início</Label>
              <Input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Fim</Label>
              <Input type="date" value={fim} onChange={(e) => setFim(e.target.value)} />
            </div>
            <div className="flex items-end">
              <Button onClick={() => refetch()} disabled={isFetching} variant="primary" className="w-full">
                <Download className="h-4 w-4" /> {isFetching ? "Gerando…" : "Gerar"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {rows.length > 0 && (
        <>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex flex-wrap gap-4">
              {totals.map((t) => (
                <div key={t.label} className="rounded-md border border-border bg-white px-4 py-2">
                  <p className="text-xs uppercase text-muted-foreground">{t.label}</p>
                  <p className="font-display text-lg font-bold text-navy">{t.value}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={exportExcel}>
                <FileSpreadsheet className="h-4 w-4" /> Excel
              </Button>
              <Button variant="outline" onClick={exportPDF}>
                <FileText className="h-4 w-4" /> PDF
              </Button>
            </div>
          </div>

          <DataTable<Row>
            rows={rows}
            columns={cols.map((c) => ({
              key: c.key,
              header: c.header,
              cell: (r) => (c.format ? c.format(r[c.key], r) : String(r[c.key] ?? "—")),
            }))}
          />
        </>
      )}
    </div>
  );
}

// ============================================================
// Data loaders
// ============================================================
async function fetchReport(type: ReportType, inicio: string, fim: string): Promise<Row[]> {
  if (type === "receivables") {
    const { data, error } = await supabase
      .from("receivables")
      .select("numero_parcela, total_parcelas, valor_previsto, valor_recebido, data_prevista, data_recebimento, status, contracts(servico, companies(razao_social))")
      .gte("data_prevista", inicio).lte("data_prevista", fim)
      .order("data_prevista");
    if (error) throw error;
    return (data ?? []).map((r: Row) => ({
      ...r,
      empresa: (r.contracts as Row | null)?.companies ? ((r.contracts as Row).companies as Row).razao_social : "",
      servico: (r.contracts as Row | null)?.servico ?? "",
    }));
  }
  if (type === "payables") {
    const { data, error } = await supabase
      .from("payables")
      .select("descricao, fornecedor, valor, data_vencimento, data_pagamento, status, financial_categories(nome)")
      .gte("data_vencimento", inicio).lte("data_vencimento", fim)
      .order("data_vencimento");
    if (error) throw error;
    return (data ?? []).map((r: Row) => ({ ...r, categoria: (r.financial_categories as Row | null)?.nome ?? "" }));
  }
  if (type === "contracts") {
    const { data, error } = await supabase
      .from("contracts")
      .select("data_venda, servico, valor_bruto, valor_imposto, valor_liquido, status, companies(razao_social), sellers(nome)")
      .gte("data_venda", inicio).lte("data_venda", fim)
      .order("data_venda");
    if (error) throw error;
    return (data ?? []).map((r: Row) => ({
      ...r,
      empresa: (r.companies as Row | null)?.razao_social ?? "",
      vendedor: (r.sellers as Row | null)?.nome ?? "",
    }));
  }
  // commissions
  const { data, error } = await supabase
    .from("commission_calculations")
    .select("periodo_inicio, periodo_fim, total_vendido, total_liquido, comissao_calculada, status, criado_em, sellers(nome)")
    .gte("periodo_inicio", inicio).lte("periodo_fim", fim)
    .order("criado_em", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r: Row) => ({ ...r, vendedor: (r.sellers as Row | null)?.nome ?? "" }));
}

function columnsFor(type: ReportType): ColumnSpec[] {
  if (type === "receivables") return [
    { key: "empresa",          header: "Empresa" },
    { key: "servico",          header: "Serviço" },
    { key: "numero_parcela",   header: "Parc.", format: (_, r) => `${r.numero_parcela}/${r.total_parcelas}` },
    { key: "data_prevista",    header: "Vencimento", format: (v) => formatDate(v as string) },
    { key: "valor_previsto",   header: "Previsto",  format: (v) => formatMoney(v as number) },
    { key: "valor_recebido",   header: "Recebido",  format: (v) => formatMoney(v as number) },
    { key: "data_recebimento", header: "Pago em",   format: (v) => formatDate(v as string) },
    { key: "status",           header: "Status" },
  ];
  if (type === "payables") return [
    { key: "descricao",       header: "Descrição" },
    { key: "categoria",       header: "Categoria" },
    { key: "fornecedor",      header: "Fornecedor" },
    { key: "data_vencimento", header: "Vencimento", format: (v) => formatDate(v as string) },
    { key: "valor",           header: "Valor",      format: (v) => formatMoney(v as number) },
    { key: "data_pagamento",  header: "Pago em",    format: (v) => formatDate(v as string) },
    { key: "status",          header: "Status" },
  ];
  if (type === "contracts") return [
    { key: "data_venda",      header: "Venda",      format: (v) => formatDate(v as string) },
    { key: "empresa",         header: "Empresa" },
    { key: "servico",         header: "Serviço" },
    { key: "vendedor",        header: "Vendedor" },
    { key: "valor_bruto",     header: "Bruto",   format: (v) => formatMoney(v as number) },
    { key: "valor_imposto",   header: "Imposto", format: (v) => formatMoney(v as number) },
    { key: "valor_liquido",   header: "Líquido", format: (v) => formatMoney(v as number) },
    { key: "status",          header: "Status" },
  ];
  return [
    { key: "vendedor",            header: "Vendedor" },
    { key: "periodo_inicio",      header: "Início", format: (v) => formatDate(v as string) },
    { key: "periodo_fim",         header: "Fim",    format: (v) => formatDate(v as string) },
    { key: "total_vendido",       header: "Recebido", format: (v) => formatMoney(v as number) },
    { key: "total_liquido",       header: "Líquido",  format: (v) => formatMoney(v as number) },
    { key: "comissao_calculada",  header: "Comissão", format: (v) => formatMoney(v as number) },
    { key: "status",              header: "Status" },
  ];
}

function computeTotals(type: ReportType, rows: Row[]): { label: string; value: string }[] {
  if (rows.length === 0) return [];
  const sum = (k: string) => rows.reduce((s, r) => s + Number(r[k] ?? 0), 0);
  if (type === "receivables") return [
    { label: "Registros", value: String(rows.length) },
    { label: "Previsto",  value: formatMoney(sum("valor_previsto")) },
    { label: "Recebido",  value: formatMoney(sum("valor_recebido")) },
  ];
  if (type === "payables") return [
    { label: "Registros", value: String(rows.length) },
    { label: "Total",     value: formatMoney(sum("valor")) },
  ];
  if (type === "contracts") return [
    { label: "Contratos", value: String(rows.length) },
    { label: "Bruto",     value: formatMoney(sum("valor_bruto")) },
    { label: "Líquido",   value: formatMoney(sum("valor_liquido")) },
  ];
  return [
    { label: "Fechamentos", value: String(rows.length) },
    { label: "Líquido",     value: formatMoney(sum("total_liquido")) },
    { label: "Comissão",    value: formatMoney(sum("comissao_calculada")) },
  ];
}
