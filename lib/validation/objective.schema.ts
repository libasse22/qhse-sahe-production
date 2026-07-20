import { z } from "zod";

export const objectiveSchema = z.object({
  title: z.string().min(3, "Le titre est requis").max(150),
  description: z.string().max(2000).optional().default(""),
  unit: z.string().max(30).optional().default(""),
  targetValue: z.coerce.number(),
  deadline: z.string().min(1, "L'échéance est requise"),
  ownerId: z.string().uuid().optional().or(z.literal("")),
});

export const objectiveProgressSchema = z.object({
  currentValue: z.coerce.number(),
});
