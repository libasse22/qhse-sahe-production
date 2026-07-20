export type ObjectiveStatus = "en_cours" | "atteint" | "non_atteint";

export interface QhseObjective {
  id: string;
  title: string;
  description: string;
  unit: string;
  targetValue: number;
  currentValue: number;
  deadline: string;
  status: ObjectiveStatus;
  ownerId: string | null;
  ownerName: string | null;
  createdAt: string;
}

export const OBJECTIVE_STATUS_LABELS: Record<ObjectiveStatus, string> = {
  en_cours: "En cours",
  atteint: "Atteint",
  non_atteint: "Non atteint",
};

export const OBJECTIVE_STATUS_BADGE: Record<ObjectiveStatus, "warning" | "success" | "destructive"> = {
  en_cours: "warning",
  atteint: "success",
  non_atteint: "destructive",
};

export function objectiveProgress(o: Pick<QhseObjective, "currentValue" | "targetValue">): number {
  if (o.targetValue === 0) return 0;
  return Math.min(100, Math.round((o.currentValue / o.targetValue) * 100));
}
