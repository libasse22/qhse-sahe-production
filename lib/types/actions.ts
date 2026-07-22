import type { Enums } from "./database.types";

export type ActionStatus = Enums<"action_status">;

export interface ActionCorrective {
  id: string;
  incidentId: string;
  incidentTitle: string;
  description: string;
  responsableId: string;
  responsableName: string;
  echeance: string;
  status: ActionStatus;
  createdAt: string;
  updatedAt: string;
}

export const ACTION_STATUS_LABELS: Record<ActionStatus, string> = {
  a_faire: "ì faire",
  en_cours: "En cours",
  termine: "Terminée",
};

export const ACTION_STATUS_BADGE_VARIANT: Record<
  ActionStatus,
  "outline" | "warning" | "success"
> = {
  a_faire: "outline",
  en_cours: "warning",
  termine: "success",
};

export const ACTION_STATUS_ORDER: ActionStatus[] = ["a_faire", "en_cours", "termine"];

/** Une action est en retard si son échéance est dépassée et qu'elle n'est pas terminée. */
export function isActionEnRetard(action: Pick<ActionCorrective, "echeance" | "status">): boolean {
  if (action.status === "termine") return false;
  return new Date(action.echeance) < new Date(new Date().toDateString());
}

