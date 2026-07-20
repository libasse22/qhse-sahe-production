import { z } from "zod";
import { CATEGORY_ORDER, SEVERITY_ORDER } from "@/lib/types/incidents";

export const incidentSchema = z.object({
  title: z.string().min(3, "Le titre doit contenir au moins 3 caractères").max(150),
  description: z.string().min(10, "Décris l'incident en au moins 10 caractères"),
  category: z.enum(CATEGORY_ORDER as [string, ...string[]]),
  severity: z.enum(SEVERITY_ORDER as [string, ...string[]]),
  location: z.string().min(2, "Le lieu est requis"),
  occurredAt: z.string().min(1, "La date est requise"),
});

export type IncidentInput = z.infer<typeof incidentSchema>;

/**
 * Schéma allégé pour l'interface Ouvrier : un employé peut envoyer un
 * signalement uniquement avec une gravité (icône/couleur) et, au choix, une
 * localisation, un texte court ou rien du tout si un message vocal est joint
 * séparément après la création.
 */
export const quickIncidentSchema = z.object({
  severity: z.enum(SEVERITY_ORDER as [string, ...string[]]),
  location: z.string().max(200).optional().default(""),
  description: z.string().max(2000).optional().default(""),
});

export type QuickIncidentInput = z.infer<typeof quickIncidentSchema>;
