#!/usr/bin/env node
/**
 * scripts/check-env.mjs
 * Valida variáveis obrigatórias antes de build/deploy.
 */
const required = ["VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY"];
const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`Variáveis ausentes: ${missing.join(", ")}`);
  process.exit(1);
}
console.log("Ambiente OK:", required.join(", "));
