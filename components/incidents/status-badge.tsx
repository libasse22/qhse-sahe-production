import { Badge } from "@/components/ui/badge";
import { STATUS_BADGE_VARIANT, STATUS_LABELS, type IncidentStatus } from "@/lib/types/incidents";

export function IncidentStatusBadge({ status }: { status: IncidentStatus }) {
  return <Badge variant={STATUS_BADGE_VARIANT[status]}>{STATUS_LABELS[status]}</Badge>;
}
