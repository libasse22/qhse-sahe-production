import Link from "next/link";
import { FileText, Plus, FileDown } from "lucide-react";
import { getCurrentPermissions } from "@/lib/services/roles.service";
import { getActivePolicy, hasAcknowledged, listPolicies, getAcknowledgementStats } from "@/lib/services/policy.service";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AcknowledgeButton } from "@/components/policy/acknowledge-button";

export default async function PolitiquePage() {
  const permissions = await getCurrentPermissions();
  const isQhseOrAdmin = permissions.has("policy.publish");

  const policy = await getActivePolicy();

  if (!policy) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Politique QHSE</h1>
        <Card>
          <CardContent className="space-y-4 p-6 text-sm text-muted-foreground">
            <p>Aucune politique QHSE n&apos;a encore été publiée.</p>
            {isQhseOrAdmin && (
              <Button asChild size="sm">
                <Link href="/politique/nouvelle">
                  <Plus className="h-4 w-4" />
                  Publier la politique QHSE
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const [acknowledged, history, stats] = await Promise.all([
    hasAcknowledged(policy.id),
    isQhseOrAdmin ? listPolicies() : Promise.resolve([policy]),
    isQhseOrAdmin ? getAcknowledgementStats(policy.id) : Promise.resolve(null),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Politique QHSE</h1>
          <p className="text-muted-foreground">Version {policy.version} — publiée par {policy.createdByName}</p>
        </div>
        {isQhseOrAdmin && (
          <Button asChild size="sm">
            <Link href="/politique/nouvelle">
              <Plus className="h-4 w-4" />
              Publier une nouvelle version
            </Link>
          </Button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>{policy.title}</CardTitle>
              <CardDescription>
                Publiée le {new Date(policy.createdAt).toLocaleDateString("fr-FR")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {policy.pdfUrl && (
                <a
                  href={policy.pdfUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg border-2 border-foreground bg-card px-4 py-2 text-sm font-semibold hover:bg-accent"
                >
                  <FileDown className="h-4 w-4" />
                  Télécharger le PDF
                </a>
              )}
              {policy.content && <p className="whitespace-pre-wrap text-sm">{policy.content}</p>}
              <AcknowledgeButton policyId={policy.id} alreadyAcknowledged={acknowledged} />
            </CardContent>
          </Card>

          {isQhseOrAdmin && history.length > 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Historique des versions</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {history.map((p) => (
                    <li key={p.id} className="flex items-center justify-between border-b border-border pb-2 text-sm last:border-0">
                      <span className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        Version {p.version} — {p.title}
                      </span>
                      <div className="flex items-center gap-2">
                        {p.isActive && <Badge variant="success">Active</Badge>}
                        <span className="text-muted-foreground">
                          {new Date(p.createdAt).toLocaleDateString("fr-FR")}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>

        {isQhseOrAdmin && stats && (
          <Card>
            <CardHeader>
              <CardTitle>Taux de lecture</CardTitle>
              <CardDescription>
                {stats.acknowledgedCount} / {stats.totalActiveUsers} utilisateurs actifs
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-emerald-500"
                  style={{
                    width: `${stats.totalActiveUsers === 0 ? 0 : Math.round((stats.acknowledgedCount / stats.totalActiveUsers) * 100)}%`,
                  }}
                />
              </div>

              {stats.pendingUsers.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">
                    N&apos;ont pas encore lu
                  </p>
                  <ul className="space-y-1 text-sm">
                    {stats.pendingUsers.map((u) => (
                      <li key={u.id} className="text-muted-foreground">
                        {u.fullName || u.email}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
