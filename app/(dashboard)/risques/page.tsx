import { listRisks } from "@/lib/services/risks.service";
import { listActiveUsers } from "@/lib/services/users.service";
import { getCurrentPermissions } from "@/lib/services/roles.service";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RiskForm } from "@/components/risks/risk-form";
import { RiskStatusSelect } from "@/components/risks/risk-status-select";
import { RISK_CATEGORY_LABELS, RISK_STATUS_LABELS, criticalityColor } from "@/lib/types/risk";

export default async function RisquesPage() {
  const permissions = await getCurrentPermissions();
  const canManage = permissions.has("risks.manage");
  const [risks, assignableUsers] = await Promise.all([
    listRisks(),
    canManage ? listActiveUsers() : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Registre des risques</h1>
          <p className="text-muted-foreground">
            Méthodologie ISO 31000 — criticité = probabilité × gravité (1 à 25).
          </p>
        </div>
      </div>

      {canManage && <RiskForm assignableUsers={assignableUsers} />}

      {risks.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            Aucun risque identifié pour le moment.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase text-muted-foreground">
                  <th className="px-6 py-3 font-medium">Risque</th>
                  <th className="px-6 py-3 font-medium">Catégorie</th>
                  <th className="px-6 py-3 font-medium">Criticité</th>
                  <th className="px-6 py-3 font-medium">Propriétaire</th>
                  <th className="px-6 py-3 font-medium">Statut</th>
                </tr>
              </thead>
              <tbody>
                {risks.map((risk) => (
                  <tr key={risk.id} className="border-b border-border last:border-0">
                    <td className="px-6 py-3">
                      <p className="font-medium">{risk.title}</p>
                      {risk.description && <p className="text-xs text-muted-foreground">{risk.description}</p>}
                    </td>
                    <td className="px-6 py-3">
                      <Badge variant="secondary">{RISK_CATEGORY_LABELS[risk.category]}</Badge>
                    </td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${criticalityColor(risk.criticality)}`}>
                        {risk.criticality}
                      </span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        ({risk.probability} × {risk.gravity})
                      </span>
                    </td>
                    <td className="px-6 py-3 text-muted-foreground">{risk.ownerName || "—"}</td>
                    <td className="px-6 py-3">
                      {canManage ? (
                        <RiskStatusSelect riskId={risk.id} status={risk.status} />
                      ) : (
                        <Badge variant="outline">{RISK_STATUS_LABELS[risk.status]}</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
