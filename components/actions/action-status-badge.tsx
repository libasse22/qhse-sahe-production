import { Badge } from "@/components/ui/badge";
import {
  ACTION_STATUS_BADGE_VARIANT,
  ACTION_STATUS_LABELS,
  ACTION_PRIORITY_BADGE_VARIANT,
  ACTION_PRIORITY_LABELS,
  isActionEnRetard,
  type ActionCorrective,
  type ActionPriority,
  type CapaEfficiencyStatus,
} from "@/lib/types/actions";

export function ActionStatusBadge({ action }: { action: Pick<ActionCorrective, "status" | "echeance" | "isBlocked"> }) {
  if (action.isBlocked || action.status === "bloquee") {
    return <Badge variant="destructive" className="font-semibold">🔴 Bloquée</Badge>;
  }

  const isOverdue = isActionEnRetard(action);

  return (
    <div className="inline-flex items-center gap-1.5">
      <Badge variant={ACTION_STATUS_BADGE_VARIANT[action.status] || "secondary"}>
        {ACTION_STATUS_LABELS[action.status] || action.status}
      </Badge>
      {isOverdue && (
        <Badge variant="destructive" className="animate-pulse font-semibold">
          ⚠️ En retard
        </Badge>
      )}
    </div>
  );
}

export function ActionPriorityBadge({ priority }: { priority: ActionPriority }) {
  return (
    <Badge variant={ACTION_PRIORITY_BADGE_VARIANT[priority] || "outline"} className="text-xs">
      {ACTION_PRIORITY_LABELS[priority] || priority}
    </Badge>
  );
}

export function ActionEfficiencyBadge({ status }: { status: CapaEfficiencyStatus }) {
  if (status === "efficace") {
    return <Badge variant="success" className="font-medium">✅ Efficace</Badge>;
  }
  if (status === "partiellement_efficace") {
    return <Badge variant="warning" className="font-medium">⚠️ Partiellement Efficace</Badge>;
  }
  if (status === "inefficace") {
    return <Badge variant="destructive" className="font-medium">❌ Inefficace</Badge>;
  }
  return <Badge variant="outline" className="text-muted-foreground">Non évaluée</Badge>;
}
