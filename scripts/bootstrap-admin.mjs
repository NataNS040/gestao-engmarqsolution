#!/usr/bin/env node
/**
 * scripts/bootstrap-admin.mjs
 *
 * Cria (ou promove) o primeiro usuário administrador.
 * Usa a SERVICE ROLE KEY — NUNCA expor no client.
 *
 * Uso:
 *   $env:SUPABASE_URL="https://xxx.supabase.co"
 *   $env:SUPABASE_SERVICE_ROLE_KEY="eyJ..."
 *   node scripts/bootstrap-admin.mjs admin@engmarq.com "Senha@Forte123" "Nome Completo"
 */
import { createClient } from "@supabase/supabase-js";

const [, , email, password, fullName = "Administrador"] = process.argv;
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente.");
  process.exit(1);
}
if (!email || !password) {
  console.error("Uso: node scripts/bootstrap-admin.mjs <email> <senha> [nome]");
  process.exit(1);
}

const admin = createClient(url, key, { auth: { persistSession: false } });

const { data: list, error: listErr } = await admin.auth.admin.listUsers();
if (listErr) { console.error(listErr); process.exit(1); }
const existing = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());

let userId;
if (existing) {
  console.log(`Usuário existente encontrado: ${existing.id}`);
  userId = existing.id;
  const { error } = await admin.auth.admin.updateUserById(userId, {
    password,
    user_metadata: { ...existing.user_metadata, full_name: fullName, role: "admin" },
  });
  if (error) { console.error(error); process.exit(1); }
} else {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, role: "admin" },
  });
  if (error) { console.error(error); process.exit(1); }
  userId = data.user.id;
  console.log(`Usuário criado: ${userId}`);
}

const { error: upErr } = await admin
  .from("profiles")
  .update({ role: "admin", active: true, full_name: fullName })
  .eq("id", userId);
if (upErr) { console.error(upErr); process.exit(1); }

console.log(`OK. ${email} agora é administrador.`);
