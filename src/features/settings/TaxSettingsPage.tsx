import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/features/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { PageHeader, DataTable } from "@/components/shared/PageHeader";
import { formatDate } from "@/lib/format";

interface TaxRow {
  id: number;
  percentual: number;
  vigencia_inicio: string;
  vigencia_fim: string | null;
  criado_em: string;
}

export default function TaxSettingsPage() {
  const { profile } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [percentual, setPercentual] = useState("");
  const [vigencia, setVigencia] = useState(new Date().toISOString().slice(0, 10));

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["tax_settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tax_settings")
        .select("*")
        .order("vigencia_inicio", { ascending: false });
      if (error) throw error;
      return (data ?? []) as TaxRow[];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("tax_settings").insert({
        percentual: Number(percentual),
        vigencia_inicio: vigencia,
        created_by: profile?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Nova vigência cadastrada. Contratos antigos não foram afetados.");
      qc.invalidateQueries({ queryKey: ["tax_settings"] });
      setOpen(false);
      setPercentual("");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao salvar"),
  });

  const ativa = rows.find((r) => r.vigencia_fim === null);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configuração de Impostos"
        description="Percentual padrão aplicado em novos contratos. Alterações não retroagem."
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> Nova vigência
          </Button>
        }
      />

      {ativa && (
        <div className="rounded-lg border-2 border-amber/40 bg-amber/10 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-dark">Vigente atualmente</p>
          <p className="mt-1 font-display text-4xl font-extrabold text-navy">{ativa.percentual}%</p>
          <p className="text-sm text-muted-foreground">Desde {formatDate(ativa.vigencia_inicio)}</p>
        </div>
      )}

      <DataTable<TaxRow>
        loading={isLoading}
        rows={rows}
        columns={[
          { key: "perc", header: "Percentual", cell: (r) => <span className="font-semibold text-navy">{r.percentual}%</span> },
          { key: "ini", header: "Início vigência", cell: (r) => formatDate(r.vigencia_inicio) },
          { key: "fim", header: "Fim vigência",    cell: (r) => r.vigencia_fim ? formatDate(r.vigencia_fim) : <span className="text-success">Ativa</span> },
          { key: "criado", header: "Cadastrado em", cell: (r) => formatDate(r.criado_em) },
        ]}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova vigência de imposto</DialogTitle>
            <DialogDescription>
              A vigência atual será encerrada um dia antes da nova entrar em vigor.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); create.mutate(); }}>
            <div className="space-y-1.5">
              <Label>Percentual (%) *</Label>
              <Input
                type="number" step="0.01" min="0" max="100" required
                value={percentual} onChange={(e) => setPercentual(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Início da vigência *</Label>
              <Input type="date" required value={vigencia} onChange={(e) => setVigencia(e.target.value)} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" variant="primary" disabled={create.isPending}>
                {create.isPending ? "Salvando…" : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
