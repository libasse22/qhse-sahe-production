import Link from "next/link";
import { FileText, Plus, FileDown } from "lucide-react";
import { getCurrentPermissions } from "@/lib/services/roles.service";
import { getActiveRegulation, listRegulations } from "@/lib/services/regulation.service";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default async function ReglementInterieurPage() {
  const permissions = await getCurrentPermissions();
  const isQhseOrAdmin = permissions.has("policy.publish");

  const regulation = await getActiveRegulation();

  if (!regulation) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Reglement interieur</h1>
        <Card>
          <CardContent className="space-y-4 p-6 text-sm text-muted-foreground">
            <p>Aucun reglement interieur n&apos;a encore ete publie.</p>
            {isQhseOrAdmin && (
              <Button asChild size="sm">
                <Link href="/reglement-interieur/nouveau">
                  <Plus className="h-4 w-4" />
                  Publier le reglement interieur
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const history = isQhseOrAdmin ? await listRegulations() : [regulation];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Reglement interieur</h1>
          <p className="text-muted-foreground">Version {regulation.version} - publie par {regulation.createdByName}</p>
        </div>
        {isQhseOrAdmin && (
          <Button asChild size="sm">
            <Link href="/reglement-interieur/nouveau">
              <Plus className="h-4 w-4" />
              Publier une nouvelle version
            </Link>
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{regulation.title}</CardTitle>
          <CardDescription>
            Publie le {new Date(regulation.createdAt).toLocaleDateString("fr-FR")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {regulation.pdfUrl && (
            <a href={regulation.pdfUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg border-2 border-foreground bg-card px-4 py-2 text-sm font-semibold hover:bg-accent">
              <FileDown className="h-4 w-4" />
              Telecharger le PDF
            </a>
          )}
          {regulation.content && <p className="whitespace-pre-wrap text-sm">{regulation.content}</p>}
        </CardContent>
      </Card>

      {isQhseOrAdmin && history.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Historique des versions</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {history.map((r) => (
                <li key={r.id} className="flex items-center justify-between border-b border-border pb-2 text-sm last:border-0">
                  <span className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    Version {r.version} - {r.title}
                  </span>
                  <div className="flex items-center gap-2">
                    {r.isActive && <Badge variant="success">Active</Badge>}
                    <span className="text-muted-foreground">
                      {new Date(r.createdAt).toLocaleDateString("fr-FR")}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
