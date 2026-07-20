import { z } from "zod";

export const auditSchema = z.object({
  title: z.string().min(3, "Le titre est requis").max(150),
  scope: z.string().min(3, "Le périmètre est requis"),
  criteria: z.string().min(3, "Les critères sont requis"),
  auditorId: z.string().uuid("Sélectionne un auditeur"),
  plannedDate: z.string().min(1, "La date est requise"),
});

export const findingSchema = z.object({
  type: z.enum(["conformite", "non_conformite_mineure", "non_conformite_majeure", "point_sensible"]),
  description: z.string().min(5, "Décris le constat en au moins 5 caractères"),
});
