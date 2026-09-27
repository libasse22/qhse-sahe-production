import { NextRequest, NextResponse } from "next/server";
import { generateFiveWhyWordBuffer, FiveWhyExportData } from "@/lib/services/five-why-export.service";

export async function POST(req: NextRequest) {
  try {
    const body: FiveWhyExportData = await req.json();

    const data: FiveWhyExportData = {
      reference: body.reference || `REF-2026-5WHY-01`,
      date: body.date || new Date().toISOString().split("T")[0],
      entreprise: body.entreprise || "QHSE Duo Sénégal",
      processus: body.processus || "Management QHSE / Analyse d'Incident",
      activite: body.activite || "Travaux et opérations QHSE",
      problemStatement: body.problemStatement || "Anomalie ou non-conformité constatée sur le terrain",
      context: body.context || "Intervention opérationnelle",
      whySteps: body.whySteps || [
        { stepNum: 1, question: "Pourquoi l'anomalie s'est-elle produite ?", answer: "La consigne spécifique n'a pas été communiquée à l'opérateur.", status: "confirmed", source: "Constat terrain" },
        { stepNum: 2, question: "Pourquoi la consigne n'a-t-elle pas été communiquée ?", answer: "La fiche de poste et le permis n'étaient pas affichés sur la zone.", status: "confirmed", source: "Inspection visuelle" },
        { stepNum: 3, question: "Pourquoi le permis n'était-il pas affiché ?", answer: "Absence de contrôle préalable de la zone avant démarrage.", status: "hypothesis", source: "Hypothèse superviseur" },
        { stepNum: 4, question: "Pourquoi le contrôle n'a-t-il pas été fait ?", answer: "À compléter sur le terrain lors de la validation.", status: "missing_info", source: "Information manquante" },
        { stepNum: 5, question: "Pourquoi la règle de contrôle n'est-elle pas appliquée ?", answer: "À compléter sur le terrain lors de la validation.", status: "missing_info", source: "Information manquante" },
      ],
      confirmedFacts: body.confirmedFacts || ["Consigne non affichée", "Permis non visible"],
      hypotheses: body.hypotheses || ["Manque de temps du superviseur"],
      missingInformation: body.missingInformation || ["Formations récentes de l'équipe"],
      rootCauseCandidate: body.rootCauseCandidate || "Procédure de validation préalable du Permis de Travail non systématique.",
      correctiveDirection: body.correctiveDirection || "Rendre le Permis de Travail obligatoire et bloquant avant démarrage.",
      preventiveDirection: body.preventiveDirection || "Revoir la grille de contrôle d'affichage des consignes sur chantier.",
      version: body.version || "1.0",
      preparePar: body.preparePar || "Responsable QHSE",
      validePar: body.validePar || "Direction QHSE",
      sourceMethodo: body.sourceMethodo || "Cimteranga — Analyse des Causes Racines",
      sourceDocument: body.sourceDocument || "ISM_M2QHSE_REVISION_MODULE SMI.pdf",
      isMissingData: Boolean(body.isMissingData),
    };

    const wordBuffer = await generateFiveWhyWordBuffer(data);

    const fileName = `5WHY_QHSE_${data.reference.replace(/[^a-zA-Z0-9_-]/g, "_")}_${data.date}.docx`;

    return new NextResponse(new Uint8Array(wordBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (err: any) {
    console.error("Erreur lors de la génération du rapport Word 5 Why:", err);
    return NextResponse.json(
      { error: "Impossible de générer le rapport Word 5 Why." },
      { status: 500 }
    );
  }
}
