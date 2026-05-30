import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/features/auth/AuthContext";
import { can } from "@/lib/permissions";
import { formatCnpj, formatDateTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { PageHeader, DataTable } from "@/components/shared/PageHeader";

interface Company {
  id: string;
  razao_social: string;
  nome_fantasia: string | null;
  cnpj: string;
  responsavel: string | null;
  telefone: string | null;
  email: string | null;
  endereco: string | null;
  observacoes: string | null;
  created_at: string;
  created_by: string | null;
}

const empty: Partial<Company> = {
  razao_social: "", nome_fantasia: "", cnpj: "", responsavel: "",
  telefone: "", email: "", endereco: "", observacoes: "",
};

export default function CompaniesPage() {
  const { profile } = useAuth();
  const role = profile?.role ?? "comercial";
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Company> | null>(null);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["companies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .order("razao_social");
      if (error) throw error;
      return (data ?? []) as Company[];
    },
  });

  const upsert = useMutation({
    mutationFn: async (input: Partial<Company>) => {
      const payload = { ...input };
      // CNPJ apenas dígitos
      if (payload.cnpj) payload.cnpj = payload.cnpj.replace(/\D/g, "");

      if (input.id) {
        const { error } = await supabase.from("companies").update(payload).eq("id", input.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("companies").insert({
          ...payload,
          created_by: profile?.id,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Empresa salva.");
      qc.invalidateQueries({ queryKey: ["companies"] });
      setOpen(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao salvar"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("companies").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Empresa removida.");
      qc.invalidateQueries({ queryKey: ["companies"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao remover"),
  });

  function openNew() { setEditing(empty); setOpen(true); }
  function openEdit(c: Company) { setEditing(c); setOpen(true); }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Empresas"
        description="Clientes da EngMarq Solution."
        actions={
          can(role, "create", "companies") && (
            <Button onClick={openNew}>
              <Plus className="h-4 w-4" /> Nova empresa
            </Button>
          )
        }
      />

      <DataTable<Company>
        loading={isLoading}
        rows={rows}
        columns={[
          { key: "razao", header: "Razão social", cell: (r) => (
            <div>
              <div className="font-semibold text-navy">{r.razao_social}</div>
              {r.nome_fantasia && <div className="text-xs text-muted-foreground">{r.nome_fantasia}</div>}
            </div>
          )},
          { key: "cnpj",      header: "CNPJ",         cell: (r) => formatCnpj(r.cnpj) },
          { key: "resp",      header: "Responsável",  cell: (r) => r.responsavel ?? "—" },
          { key: "tel",       header: "Telefone",     cell: (r) => r.telefone ?? "—" },
          { key: "email",     header: "E-mail",       cell: (r) => r.email ?? "—" },
          { key: "criado",    header: "Criada em",    cell: (r) => formatDateTime(r.created_at) },
          { key: "acoes",     header: "",             className: "w-28 text-right", cell: (r) => (
            <div className="flex justify-end gap-1">
              {can(role, "update", "companies") && (
                <Button size="icon" variant="ghost" onClick={() => openEdit(r)} aria-label="Editar">
                  <Pencil className="h-4 w-4" />
                </Button>
              )}
              {can(role, "delete", "companies") && (
                <Button
                  size="icon" variant="ghost"
                  onClick={() => confirm(`Remover ${r.razao_social}?`) && remove.mutate(r.id)}
                  aria-label="Remover"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </div>
          )},
        ]}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Editar empresa" : "Nova empresa"}</DialogTitle>
            <DialogDescription>Cadastro completo do cliente.</DialogDescription>
          </DialogHeader>
          {editing && (
            <form
              className="grid grid-cols-1 gap-4 sm:grid-cols-2"
              onSubmit={(e) => {
                e.preventDefault();
                upsert.mutate(editing);
              }}
            >
              <Field label="Razão social" required className="sm:col-span-2">
                <Input
                  required
                  value={editing.razao_social ?? ""}
                  onChange={(e) => setEditing({ ...editing, razao_social: e.target.value })}
                />
              </Field>
              <Field label="Nome fantasia">
                <Input
                  value={editing.nome_fantasia ?? ""}
                  onChange={(e) => setEditing({ ...editing, nome_fantasia: e.target.value })}
                />
              </Field>
              <Field label="CNPJ" required>
                <Input
                  required maxLength={18} placeholder="00.000.000/0000-00"
                  value={editing.cnpj ?? ""}
                  onChange={(e) => setEditing({ ...editing, cnpj: e.target.value })}
                />
              </Field>
              <Field label="Responsável">
                <Input
                  value={editing.responsavel ?? ""}
                  onChange={(e) => setEditing({ ...editing, responsavel: e.target.value })}
                />
              </Field>
              <Field label="Telefone">
                <Input
                  value={editing.telefone ?? ""}
                  onChange={(e) => setEditing({ ...editing, telefone: e.target.value })}
                />
              </Field>
              <Field label="E-mail" className="sm:col-span-2">
                <Input
                  type="email"
                  value={editing.email ?? ""}
                  onChange={(e) => setEditing({ ...editing, email: e.target.value })}
                />
              </Field>
              <Field label="Endereço" className="sm:col-span-2">
                <Input
                  value={editing.endereco ?? ""}
                  onChange={(e) => setEditing({ ...editing, endereco: e.target.value })}
                />
              </Field>
              <Field label="Observações" className="sm:col-span-2">
                <Textarea
                  value={editing.observacoes ?? ""}
                  onChange={(e) => setEditing({ ...editing, observacoes: e.target.value })}
                />
              </Field>

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

function Field({
  label, children, required, className,
}: { label: string; children: React.ReactNode; required?: boolean; className?: string }) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <Label>{label}{required && <span className="ml-1 text-destructive">*</span>}</Label>
      {children}
    </div>
  );
}
