import { z } from "zod";

export const policySchema = z.object({
  title: z.string().min(3, "Le titre doit contenir au moins 3 caractères").max(150),
  content: z.string().max(20000).optional().default(""),
});

export type PolicyInput = z.infer<typeof policySchema>;
