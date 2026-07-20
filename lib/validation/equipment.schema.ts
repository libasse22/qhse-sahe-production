import { z } from "zod";

export const equipmentSchema = z.object({
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères").max(150),
  category: z.string().max(80).optional().default(""),
  serialNumber: z.string().max(80).optional().default(""),
  siteId: z.string().uuid().optional().or(z.literal("")),
});

export type EquipmentInput = z.infer<typeof equipmentSchema>;
