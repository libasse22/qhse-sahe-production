import { z } from "zod";

export const managementReviewSchema = z.object({
  title: z.string().min(3, "Le titre est requis").max(150),
  reviewDate: z.string().min(1, "La date est requise"),
  summary: z.string().min(10, "Résume les indicateurs et faits marquants"),
  decisions: z.string().max(4000).optional().default(""),
});
