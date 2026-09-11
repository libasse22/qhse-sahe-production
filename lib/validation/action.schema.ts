import { z } from "zod";

export const actionSchema = z.object({
  description: z.string().min(5, "Décris l'action en au moins 5 caractères"),
  responsableId: z.string().uuid("Sélectionne un responsable valide"),
  echeance: z.string().min(1, "L'échéance est requise"),
  typeAction: z.enum(["corrective", "preventive", "amelioration"]).default("corrective"),
  domaineQhse: z.enum(["qualite", "securite", "environnement", "hygiene"]).default("securite"),
  priorite: z.enum(["faible", "moyenne", "elevee", "critique"]).default("moyenne"),
  workPermitId: z.string().uuid().optional().nullable(),
  causeImmediate: z.string().optional().nullable(),
  causeRacine: z.string().optional().nullable(),
  methodeAnalyse: z.string().optional().nullable(),
  analyse5Pourquoi: z.array(z.string()).optional().nullable(),
});

export type ActionInput = z.infer<typeof actionSchema>;

export const actionStatusSchema = z.object({
  status: z.enum([
    "brouillon",
    "ouverte",
    "en_cours",
    "bloquee",
    "a_verifier",
    "cloturee",
    "rejetee",
    "reouverte",
    "a_faire",
    "termine",
  ]),
  motif: z.string().optional(),
});

export const actionBlockSchema = z.object({
  reasonCategory: z.enum([
    "ressources",
    "budget",
    "fournisseur",
    "dependance",
    "validation_management",
    "technique",
    "autre",
  ]),
  reasonDetail: z.string().min(5, "Fournis une explication détaillée du blocage (au moins 5 caractères)."),
});

export type ActionBlockInput = z.infer<typeof actionBlockSchema>;

export const actionVerificationSchema = z.object({
  efficaciteStatut: z.enum(["efficace", "partiellement_efficace", "inefficace"]),
  commentaireEfficacite: z.string().min(5, "Saisis un commentaire d'évaluation d'au moins 5 caractères."),
  createChildAction: z.boolean().optional(),
});

export type ActionVerificationInput = z.infer<typeof actionVerificationSchema>;

export const actionCommentSchema = z.object({
  comment: z.string().min(2, "Le commentaire doit comporter au moins 2 caractères."),
});
