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
  a_faire: "Ã€ faire",
  en_cours: "En cours",
  termine: "TerminÃ©e",
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

/** Une action est en retard si son Ã©chÃ©ance est dÃ©passÃ©e et qu'elle n'est pas terminÃ©e. */
export function isActionEnRetard(action: Pick<ActionCorrective, "echeance" | "status">): boolean {
  if (action.status === "termine") return false;
  return new Date(action.echeance) < new Date(new Date().toDateString());
}

