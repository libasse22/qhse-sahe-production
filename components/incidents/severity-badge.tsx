import { Badge } from "@/components/ui/badge";
import { SEVERITY_BADGE_VARIANT, SEVERITY_LABELS, type IncidentSeverity } from "@/lib/types/incidents";

export function SeverityBadge({ severity }: { severity: IncidentSeverity }) {
  if (severity === "critique") {
    return (
      <span className="hazard-stripe inline-flex items-center rounded px-2.5 py-0.5 text-xs font-bold text-foreground">
        <span className="rounded-sm bg-background/90 px-1.5">{SEVERITY_LABELS.critique}</span>
      </span>
    );
  }
  return <Badge variant={SEVERITY_BADGE_VARIANT[severity]}>{SEVERITY_LABELS[severity]}</Badge>;
}
