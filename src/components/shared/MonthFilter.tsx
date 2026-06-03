import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

interface Props {
  value: string;
  onChange: (v: string) => void;
  label?: string;
  /** Quantos anos para frente/atrás listar (default: 2). */
  range?: number;
}

/**
 * Filtro de mês/ano no formato "YYYY-MM" (ou string vazia = "todos").
 */
export function MonthFilter({ value, onChange, label = "Mês", range = 2 }: Props) {
  const now = new Date();
  const year = now.getFullYear();
  const options: { value: string; label: string }[] = [];
  for (let y = year + range; y >= year - range; y--) {
    for (let m = 11; m >= 0; m--) {
      const v = `${y}-${String(m + 1).padStart(2, "0")}`;
      options.push({ value: v, label: `${MESES[m]}/${y}` });
    }
  }
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Todos</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </Select>
    </div>
  );
}

/** Retorna true se a data (YYYY-MM-DD ou ISO) bate com o filtro YYYY-MM. */
export function matchesMonth(date: string | null | undefined, monthFilter: string): boolean {
  if (!monthFilter) return true;
  if (!date) return false;
  return date.slice(0, 7) === monthFilter;
}
