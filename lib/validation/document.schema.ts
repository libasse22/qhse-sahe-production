import { z } from "zod";

export const documentMetaSchema = z.object({
  title: z.string().min(2, "Le titre est requis").max(150),
  category: z.string().max(100).optional().default("Général"),
});
