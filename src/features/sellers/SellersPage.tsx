import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/features/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { PageHeader, DataTable } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";

interface Seller {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  percentual_padrao: number | null;
  status: "ativo" | "inativo";
}

const empty: Partial<Seller> = { nome: "", email: "", telefone: "", percentual_padrao: null, status: "ativo" };

export default function SellersPage() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Seller> | null>(null);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["sellers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("sellers").select("*").order("nome");
      if (error) throw error;
      return (data ?? []) as Seller[];
    },
  });

  const upsert = useMutation({
    mutationFn: async (input: Partial<Seller>) => {
      const payload = {
        ...input,
        percentual_padrao:
          input.percentual_padrao === null || input.percentual_padrao === undefined || Number.isNaN(input.percentual_padrao)
            ? null
            : Number(input.percentual_padrao),
      };
      if (input.id) {
        const { error } = await supabase.from("sellers").update(payload as any).eq("id", input.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("sellers").insert(payload as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Vendedor salvo.");
      qc.invalidateQueries({ queryKey: ["sellers"] });
      setOpen(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao salvar"),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vendedores"
        description="Equipe comercial e percentuais individuais."
        actions={isAdmin && (
          <Button onClick={() => { setEditing(empty); setOpen(true); }}>
            <Plus className="h-4 w-4" /> Novo vendedor
          </Button>
        )}
      />

      <DataTable<Seller>
        loading={isLoading}
        rows={rows}
        columns={[
          { key: "nome", header: "Nome", cell: (r) => <span className="font-semibold text-navy">{r.nome}</span> },
          { key: "email", header: "E-mail", cell: (r) => r.email ?? "—" },
          { key: "tel", header: "Telefone", cell: (r) => r.telefone ?? "—" },
          { key: "perc", header: "% padrão", cell: (r) => r.percentual_padrao != null ? `${r.percentual_padrao}%` : "—" },
          { key: "status", header: "Status", cell: (r) => <StatusBadge kind="seller" value={r.status} /> },
          { key: "acoes", header: "", className: "w-20 text-right", cell: (r) => (
            isAdmin && (
              <Button size="icon" variant="ghost" onClick={() => { setEditing(r); setOpen(true); }} aria-label="Editar">
                <Pencil className="h-4 w-4" />
              </Button>
            )
          )},
        ]}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Editar vendedor" : "Novo vendedor"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); upsert.mutate(editing); }}>
              <div className="space-y-1.5">
                <Label>Nome *</Label>
                <Input required value={editing.nome ?? ""} onChange={(e) => setEditing({ ...editing, nome: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>E-mail</Label>
                  <Input type="email" value={editing.email ?? ""} onChange={(e) => setEditing({ ...editing, email: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Telefone</Label>
                  <Input value={editing.telefone ?? ""} onChange={(e) => setEditing({ ...editing, telefone: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>% padrão (opcional)</Label>
                  <Input
                    type="number" step="0.01" min="0" max="100"
                    value={editing.percentual_padrao ?? ""}
                    onChange={(e) => setEditing({ ...editing, percentual_padrao: e.target.value === "" ? null : Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select
                    value={editing.status ?? "ativo"}
                    onChange={(e) => setEditing({ ...editing, status: e.target.value as Seller["status"] })}
                  >
                    <option value="ativo">Ativo</option>
                    <option value="inativo">Inativo</option>
                  </Select>
                </div>
              </div>
              <DialogFooter>
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
