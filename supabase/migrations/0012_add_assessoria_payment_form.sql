-- =============================================================
-- 0012_add_assessoria_payment_form.sql
-- Adiciona '12x' ao enum payment_form para contratos de assessoria
-- mensal (valor total dividido em 12 parcelas mensais).
-- =============================================================

alter type public.payment_form add value if not exists '12x';
