import type { UserRole, UserStatus } from "./database.types";

export type { UserRole, UserStatus };

export interface Profile {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  status: UserStatus;
  roleId: string | null;
  createdAt: string;
  updatedAt: string;
}

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administrateur",
  manager_qhse: "Manager QHSE",
  employe: "Employé",
};

export const STATUS_LABELS: Record<UserStatus, string> = {
  pending: "En attente de validation",
  active: "Actif",
  suspended: "Suspendu",
};
