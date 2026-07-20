import { z } from "zod";

export const riskSchema = z.object({
  title: z.string().min(3, "Le titre est requis").max(150),
  description: z.string().max(2000).optional().default(""),
  category: z.enum(["qualite", "securite", "environnement", "autre"]),
  probability: z.coerce.number().int().min(1).max(5),
  gravity: z.coerce.number().int().min(1).max(5),
  treatment: z.string().max(2000).optional().default(""),
  ownerId: z.string().uuid().optional().or(z.literal("")),
});
