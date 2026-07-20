import { listInterestedParties, listComplianceObligations } from "@/lib/services/compliance.service";
import { getCurrentPermissions } from "@/lib/services/roles.service";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { InterestedPartyForm } from "@/components/compliance/interested-party-form";
import { ObligationForm } from "@/components/compliance/obligation-form";
import { ObligationStatusSelect } from "@/components/compliance/obligation-status-select";
import { COMPLIANCE_STATUS_LABELS } from "@/lib/types/compliance";

export default async function PartiesInteresseesPage() {
  const [parties, obligations, permissions] = await Promise.all([
    listInterestedParties(),
    listComplianceObligations(),
    getCurrentPermissions(),
  ]);
  const canManage = permissions.has("compliance.manage");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Parties intéressées & conformité</h1>
        <p className="text-muted-foreground">ISO 14001 §4.2 / §6.1.3 — parties concernées, leurs attentes, et les obligations réglementaires applicables.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Parties intéressées</CardTitle>
          <CardDescription>Autorités, clients, salariés, riverains, fournisseurs…</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {canManage && <InterestedPartyForm />}
          {parties.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune partie intéressée enregistrée.</p>
          ) : (
            <ul className="space-y-2">
              {parties.map((p) => (
                <li key={p.id} className="rounded-lg border border-border p-3">
                  <p className="font-medium">
                    {p.name} {p.category && <span className="text-xs text-muted-foreground">— {p.category}</span>}
                  </p>
                  {p.expectations && <p className="mt-1 text-sm text-muted-foreground">{p.expectations}</p>}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Obligations de conformité</CardTitle>
          <CardDescription>Textes réglementaires, normes, exigences contractuelles.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {canManage && <ObligationForm />}
          {obligations.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune obligation enregistrée.</p>
          ) : (
            <ul className="space-y-2">
              {obligations.map((o) => (
                <li key={o.id} className="flex items-start justify-between gap-3 rounded-lg border border-border p-3">
                  <div>
                    <p className="text-sm font-medium">{o.description}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {o.source}
                      {o.reviewDate ? ` · Prochaine revue : ${new Date(o.reviewDate).toLocaleDateString("fr-FR")}` : ""}
                    </p>
                  </div>
                  {canManage ? (
                    <ObligationStatusSelect obligationId={o.id} status={o.status} />
                  ) : (
                    <span className="text-xs text-muted-foreground">{COMPLIANCE_STATUS_LABELS[o.status]}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
