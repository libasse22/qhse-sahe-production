import type { UserRole } from "./database.types";

export interface Permission {
  id: string;
  code: string;
  label: string;
  category: string;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  baseBucket: UserRole;
  isSystem: boolean;
  permissionCodes: string[];
}

export const BASE_BUCKET_LABELS: Record<UserRole, string> = {
  admin: "Espace Administration",
  manager_qhse: "Espace Responsable QHSE",
  employe: "Espace Terrain (Ouvrier)",
};
