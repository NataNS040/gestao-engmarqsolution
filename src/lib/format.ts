const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const PERCENT = new Intl.NumberFormat("pt-BR", {
  style: "percent",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const DATE = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" });
const DATETIME = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

export const formatMoney = (value: number | null | undefined) =>
  BRL.format(Number(value ?? 0));

/** Recebe percentual em forma decimal (0.06) OU inteiro (6) — detecta automaticamente. */
export const formatPercent = (value: number | null | undefined) => {
  const v = Number(value ?? 0);
  return PERCENT.format(v > 1 ? v / 100 : v);
};

export const formatDate = (value: string | Date | null | undefined) =>
  value ? DATE.format(new Date(value)) : "—";

export const formatDateTime = (value: string | Date | null | undefined) =>
  value ? DATETIME.format(new Date(value)) : "—";

export const formatCnpj = (cnpj: string) => {
  const d = cnpj.replace(/\D/g, "").padStart(14, "0").slice(0, 14);
  return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2}).*/, "$1.$2.$3/$4-$5");
};
