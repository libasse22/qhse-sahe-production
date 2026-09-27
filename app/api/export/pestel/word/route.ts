import { NextRequest, NextResponse } from "next/server";
import { generatePestelWordBuffer, PestelExportData } from "@/lib/services/pestel-export.service";

export async function POST(req: NextRequest) {
  try {
    const body: PestelExportData = await req.json();

    const data: PestelExportData = {
      reference: body.reference || `REF-2026-PESTEL-01`,
      date: body.date || new Date().toISOString().split("T")[0],
      entreprise: body.entreprise || "QHSE Duo Sénégal",
      domaine: body.domaine || "Stratégie & Contexte QHSE",
      processus: body.processus || "Management des Risques & Enjeux",
      perimetre: body.perimetre || "Global Entreprise",
      version: body.version || "1.0",
      preparePar: body.preparePar || "Responsable QHSE",
      validePar: body.validePar || "Direction QHSE",
      sourceMethodo: body.sourceMethodo || "Cimteranga — Enjeux & Contexte Stratégique (4.1)",
      sourceDocument: body.sourceDocument || "ISM_M2QHSE_REVISION_MODULE SMI.pdf",
      isMissingData: Boolean(body.isMissingData),
      rows: body.rows || [
        { num: 1, axe: "Politique", facteur: "Directives nationales et politiques SSE", situationActuelle: "Conforme", opportunite: "Valorisation RSE & Certification ISO", menace: "Évolution réglementaire stricte", impact: "Élevé", commentaire: "À suivre régulièrement", source: "Code du Travail Sénégal" },
        { num: 2, axe: "Économique", facteur: "Coûts de non-qualité et budget QHSE", situationActuelle: "Sous contrôle", opportunite: "Réduction du coût des incidents", menace: "Hausse des coûts des EPI/équipements", impact: "Moyen", commentaire: "Budget annuel à consolider", source: "Plan d'actions QSE" },
        { num: 3, axe: "Socioculturel", facteur: "Culture sécurité & climat social", situationActuelle: "Engagement moyen", opportunite: "Sensibilisation et quart d'heure sécurité", menace: "Résistance au changement", impact: "Élevé", commentaire: "Renforcer les formations", source: "Bilan Annuel SSE" },
        { num: 4, axe: "Technologique", facteur: "Digitalisation & outils Copilote QHSE", situationActuelle: "Déploiement en cours", opportunite: "Automatisation de la conformité", menace: "Non-adoption de la plateforme", impact: "Moyen", commentaire: "Formation des superviseurs", source: "Copilote QHSE" },
        { num: 5, axe: "Écologique", facteur: "Gestion des déchets & rejets", situationActuelle: "Plan de tri actif", opportunite: "Éco-gestion et valorisation", menace: "Pollution accidentelle", impact: "Élevé", commentaire: "Audits de conformité 14001", source: "Manuel Environnement" },
        { num: 6, axe: "Légal", facteur: "Conformité réglementaire et normes ISO", situationActuelle: "Veille légale active", opportunite: "Certification SMI intégrée", menace: "Sanctions ou mises en demeure", impact: "Critique", commentaire: "Mise à jour du registre légal", source: "Registre de Conformité" }
      ],
    };

    const wordBuffer = await generatePestelWordBuffer(data);

    const fileName = `PESTEL_QHSE_${data.reference.replace(/[^a-zA-Z0-9_-]/g, "_")}_${data.date}.docx`;

    return new NextResponse(new Uint8Array(wordBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (err: any) {
    console.error("Erreur lors de la génération du rapport Word PESTEL:", err);
    return NextResponse.json(
      { error: "Impossible de générer le rapport Word PESTEL." },
      { status: 500 }
    );
  }
}
