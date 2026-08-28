import { Badge } from "@/components/ui/badge";
import {
  PERMIT_STATUS_BADGE_VARIANT,
  PERMIT_STATUS_LABELS,
  type WorkPermitStatus,
} from "@/lib/types/permits";

export function PermitStatusBadge({ status }: { status: WorkPermitStatus }) {
  return (
    <Badge variant={PERMIT_STATUS_BADGE_VARIANT[status] || "outline"}>
      {PERMIT_STATUS_LABELS[status] || status}
    </Badge>
  );
}
