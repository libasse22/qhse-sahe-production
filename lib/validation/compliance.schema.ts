import { z } from "zod";

export const interestedPartySchema = z.object({
  name: z.string().min(2, "Le nom est requis").max(150),
  category: z.string().max(100).optional().default(""),
  expectations: z.string().max(2000).optional().default(""),
});

export const complianceObligationSchema = z.object({
  description: z.string().min(5, "La description est requise"),
  source: z.string().max(300).optional().default(""),
  reviewDate: z.string().optional().or(z.literal("")),
});
