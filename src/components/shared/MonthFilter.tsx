import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface Props {
  value: string;
  onChange: (v: string) => void;
  label?: string;
}

/**
 * Filtro de mês/ano usando input nativo type="month" (calendário do navegador).
 * Valor no formato "YYYY-MM" (string vazia = "todos").
 */
export function MonthFilter({ value, onChange, label = "Mês" }: Props) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <Input
          type="month"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-44"
        />
        {value && (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            title="Limpar filtro"
            onClick={() => onChange("")}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

/** Retorna true se a data (YYYY-MM-DD ou ISO) bate com o filtro YYYY-MM. */
export function matchesMonth(date: string | null | undefined, monthFilter: string): boolean {
  if (!monthFilter) return true;
  if (!date) return false;
  return date.slice(0, 7) === monthFilter;
}
