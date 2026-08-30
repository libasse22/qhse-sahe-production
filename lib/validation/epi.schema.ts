import { z } from "zod";

export const epiCatalogSchema = z.object({
  name: z.string().min(2, "Le nom du modèle d'EPI est requis."),
  category: z.enum([
    "casque",
    "chaussures",
    "gants",
    "lunettes",
    "gilet",
    "harnais",
    "ouie",
    "respiratoire",
    "autre",
  ]),
  isoNorm: z.string().optional().default(""),
  lifespanMonths: z.coerce.number().min(1).default(24),
  periodicInspectionDays: z.coerce.number().min(1).default(365),
  description: z.string().optional().default(""),
});

export type EpiCatalogInput = z.infer<typeof epiCatalogSchema>;

export const epiAssignmentSchema = z.object({
  catalogId: z.string().uuid("Sélectionne un modèle d'EPI."),
  recipientId: z.string().uuid("Sélectionne un employé destinataire."),
  serialNumber: z.string().optional().default(""),
  quantity: z.coerce.number().min(1).default(1),
  size: z.string().optional().default(""),
  conditionState: z.enum(["neuf", "bon", "use", "defectueux"]).default("bon"),
  status: z.enum(["attribue", "en_service", "a_renouveler", "restitue", "perdu_endommage"]).default("attribue"),
  assignedAt: z.string().min(1, "La date de remise est requise."),
  renewalDueAt: z.string().optional().default(""),
  notes: z.string().optional().default(""),
});

export type EpiAssignmentInput = z.infer<typeof epiAssignmentSchema>;
