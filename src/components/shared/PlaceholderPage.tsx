import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function PlaceholderPage({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold text-navy">{title}</h1>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Em construção</CardTitle>
          <CardDescription>
            Este módulo será implementado nas próximas fases do plano (ver
            <code className="mx-1 rounded bg-muted px-1.5 py-0.5 text-xs">/memories/session/plan.md</code>).
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          A fundação (auth, layout, roles e identidade visual) já está pronta.
        </CardContent>
      </Card>
    </div>
  );
}
