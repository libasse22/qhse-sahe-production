import { z } from "zod";

export const roleSchema = z.object({
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères").max(60),
  description: z.string().max(300).optional().default(""),
  baseBucket: z.enum(["admin", "manager_qhse", "employe"]),
  permissionCodes: z.array(z.string()).default([]),
});

export type RoleInput = z.infer<typeof roleSchema>;
