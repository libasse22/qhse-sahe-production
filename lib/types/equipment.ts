import type { Enums } from "./database.types";

export type EquipmentStatus = Enums<"equipment_status">;

export interface Equipment {
  id: string;
  name: string;
  category: string;
  serialNumber: string;
  siteId: string | null;
  siteName: string | null;
  status: EquipmentStatus;
  createdAt: string;
}

export const EQUIPMENT_STATUS_LABELS: Record<EquipmentStatus, string> = {
  operationnel: "Opérationnel",
  maintenance: "En maintenance",
  hors_service: "Hors service",
};

export const EQUIPMENT_STATUS_BADGE: Record<EquipmentStatus, "success" | "warning" | "destructive"> = {
  operationnel: "success",
  maintenance: "warning",
  hors_service: "destructive",
};

export const EQUIPMENT_STATUS_ORDER: EquipmentStatus[] = ["operationnel", "maintenance", "hors_service"];

