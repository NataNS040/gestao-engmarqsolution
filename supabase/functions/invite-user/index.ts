// supabase/functions/invite-user/index.ts
// Edge Function chamada apenas por admins. Cria um convite via
// auth.admin.inviteUserByEmail() — exige SUPABASE_SERVICE_ROLE_KEY
// disponível como secret na Edge Runtime.
//
// Deploy:  supabase functions deploy invite-user
// Set:     supabase secrets set SUPABASE_SERVICE_ROLE_KEY=...
//
// deno-lint-ignore-file
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.46.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    // 1. Valida que o caller é admin usando o JWT enviado
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return json({ error: "Não autenticado" }, 401);
    }
    const { data: profile } = await userClient
      .from("profiles")
      .select("role")
      .eq("id", userData.user.id)
      .single();
    if (profile?.role !== "admin") {
      return json({ error: "Apenas administradores podem convidar usuários" }, 403);
    }

    // 2. Recebe payload
    const { email, full_name, role } = await req.json();
    if (!email || !role) return json({ error: "email e role são obrigatórios" }, 400);
    if (!["admin", "financeiro", "comercial"].includes(role)) {
      return json({ error: "role inválido" }, 400);
    }

    // 3. Convida com service role
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { full_name, role },
    });
    if (error) return json({ error: error.message }, 400);

    return json({ ok: true, user_id: data.user?.id, message: "Convite enviado." });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
