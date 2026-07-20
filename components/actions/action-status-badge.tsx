import { Badge } from "@/components/ui/badge";
import {
  ACTION_STATUS_BADGE_VARIANT,
  ACTION_STATUS_LABELS,
  isActionEnRetard,
  type ActionCorrective,
} from "@/lib/types/actions";

export function ActionStatusBadge({ action }: { action: Pick<ActionCorrective, "status" | "echeance"> }) {
  if (isActionEnRetard(action)) {
    return <Badge variant="destructive">En retard</Badge>;
  }
  return <Badge variant={ACTION_STATUS_BADGE_VARIANT[action.status]}>{ACTION_STATUS_LABELS[action.status]}</Badge>;
}
