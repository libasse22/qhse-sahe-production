import { z } from "zod";

export const actionSchema = z.object({
  description: z.string().min(5, "Décris l'action en au moins 5 caractères"),
  responsableId: z.string().uuid("Sélectionne un responsable"),
  echeance: z.string().min(1, "L'échéance est requise"),
});

export type ActionInput = z.infer<typeof actionSchema>;

export const actionStatusSchema = z.object({
  status: z.enum(["a_faire", "en_cours", "termine"]),
});
