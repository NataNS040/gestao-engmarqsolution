import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-3xl font-extrabold text-navy">{title}</h1>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}

export function DataTable<T>({
  columns,
  rows,
  empty = "Nenhum registro encontrado.",
  loading,
}: {
  columns: { key: string; header: string; cell: (row: T) => ReactNode; className?: string }[];
  rows: T[];
  empty?: string;
  loading?: boolean;
}) {
  return (
    <div className="overflow-x-auto rounded-md border border-border bg-white">
      <table className="w-full text-sm">
        <thead className="bg-navy text-left text-xs uppercase tracking-wide text-white">
          <tr>
            {columns.map((c) => (
              <th key={c.key} className={`px-3 py-2.5 font-semibold ${c.className ?? ""}`}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={columns.length} className="px-3 py-6 text-center text-muted-foreground">
                Carregando…
              </td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-3 py-6 text-center text-muted-foreground">
                {empty}
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr key={i} className={i % 2 ? "bg-muted/40" : ""}>
                {columns.map((c) => (
                  <td key={c.key} className={`px-3 py-2 align-middle ${c.className ?? ""}`}>
                    {c.cell(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
