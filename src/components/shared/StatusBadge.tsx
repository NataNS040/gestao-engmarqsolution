import { Badge } from "@/components/ui/badge";

const RECEIVABLE: Record<string, { label: string; variant: "success" | "warning" | "danger" | "muted" | "default" }> = {
  pago:     { label: "Pago",     variant: "success" },
  parcial:  { label: "Parcial",  variant: "warning" },
  vencido:  { label: "Vencido",  variant: "danger"  },
  pendente: { label: "Pendente", variant: "muted"   },
};

const CONTRACT: Record<string, { label: string; variant: "success" | "warning" | "danger" | "default" }> = {
  em_andamento: { label: "Em andamento", variant: "default" },
  concluido:    { label: "Concluído",    variant: "success" },
  cancelado:    { label: "Cancelado",    variant: "danger"  },
};

const PAYABLE = RECEIVABLE; // mesmos rótulos

const INVOICE: Record<string, { label: string; variant: "success" | "muted" }> = {
  emitida:     { label: "Emitida",     variant: "success" },
  nao_emitida: { label: "Não emitida", variant: "muted"   },
};

const COMMISSION: Record<string, { label: string; variant: "success" | "muted" }> = {
  pago:     { label: "Pago",     variant: "success" },
  pendente: { label: "Pendente", variant: "muted"   },
};

const SELLER: Record<string, { label: string; variant: "success" | "muted" }> = {
  ativo:   { label: "Ativo",   variant: "success" },
  inativo: { label: "Inativo", variant: "muted"   },
};

const MAP = {
  receivable: RECEIVABLE,
  contract:   CONTRACT,
  payable:    PAYABLE,
  invoice:    INVOICE,
  commission: COMMISSION,
  seller:     SELLER,
} as const;

export function StatusBadge({
  kind,
  value,
}: {
  kind: keyof typeof MAP;
  value: string | null | undefined;
}) {
  const entry = (MAP[kind] as Record<string, { label: string; variant: "success"|"warning"|"danger"|"muted"|"default" }>)[value ?? ""];
  if (!entry) return <Badge variant="muted">—</Badge>;
  return <Badge variant={entry.variant}>{entry.label}</Badge>;
}
