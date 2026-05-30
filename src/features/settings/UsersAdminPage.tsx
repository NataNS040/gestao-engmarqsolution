import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDateTime } from "@/lib/format";
import type { UserRole } from "@/lib/permissions";

interface Row {
  id: string;
  full_name: string | null;
  email: string;
  role: UserRole;
  active: boolean;
  created_at: string;
}

export default function UsersAdminPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);
  const [form, setForm] = useState({ email: "", full_name: "", role: "comercial" as UserRole });
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, email, role, active, created_at")
      .order("created_at", { ascending: false });
    if (error) setError(error.message);
    else setRows((data ?? []) as unknown as Row[]);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function inviteUser(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setInviting(true);
    try {
      const { data, error } = await supabase.functions.invoke("invite-user", {
        body: form,
      });
      if (error) throw error;
      setMsg(`Convite enviado para ${form.email}. ${data?.message ?? ""}`);
      setForm({ email: "", full_name: "", role: "comercial" });
      await load();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Falha ao enviar convite");
    } finally {
      setInviting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold text-navy">Usuários</h1>
        <p className="text-sm text-muted-foreground">
          Convide novos usuários e gerencie permissões.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Convidar novo usuário</CardTitle>
          <CardDescription>
            Um e-mail de definição de senha será enviado pelo Supabase.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={inviteUser} className="grid gap-4 sm:grid-cols-4">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="full_name">Nome completo</Label>
              <Input
                id="full_name"
                required
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="role">Perfil</Label>
              <select
                id="role"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
                className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm"
              >
                <option value="admin">Administrador</option>
                <option value="financeiro">Financeiro</option>
                <option value="comercial">Comercial</option>
              </select>
            </div>
            <div className="flex items-end sm:col-span-3">
              <Button type="submit" disabled={inviting}>
                {inviting ? "Enviando…" : "Enviar convite"}
              </Button>
            </div>
            {msg && (
              <p className="rounded-md bg-muted px-3 py-2 text-sm text-navy sm:col-span-4">
                {msg}
              </p>
            )}
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Usuários cadastrados</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && <p className="text-sm text-muted-foreground">Carregando…</p>}
          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
          {!loading && !error && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-navy text-left text-xs uppercase tracking-wide text-white">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Nome</th>
                    <th className="px-3 py-2 font-semibold">E-mail</th>
                    <th className="px-3 py-2 font-semibold">Perfil</th>
                    <th className="px-3 py-2 font-semibold">Ativo</th>
                    <th className="px-3 py-2 font-semibold">Criado em</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={r.id} className={i % 2 ? "bg-muted/50" : ""}>
                      <td className="px-3 py-2">{r.full_name ?? "—"}</td>
                      <td className="px-3 py-2">{r.email}</td>
                      <td className="px-3 py-2 capitalize">{r.role}</td>
                      <td className="px-3 py-2">
                        {r.active ? (
                          <span className="rounded-full bg-success/15 px-2 py-0.5 text-xs font-semibold text-success">
                            Ativo
                          </span>
                        ) : (
                          <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-xs font-semibold text-destructive">
                            Inativo
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2">{formatDateTime(r.created_at)}</td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">
                        Nenhum usuário cadastrado ainda.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
