import { NextRequest, NextResponse } from "next/server";
import { generateAmdecWordBuffer, AmdecExportData } from "@/lib/services/amdec-export.service";

export async function POST(req: NextRequest) {
  try {
    const body: AmdecExportData = await req.json();

    const data: AmdecExportData = {
      reference: body.reference || `REF-2026-AMDEC-01`,
      date: body.date || new Date().toISOString().split("T")[0],
      entreprise: body.entreprise || "QHSE Duo Sénégal",
      processus: body.processus || "À renseigner",
      activite: body.activite || "Travaux et opérations QHSE",
      version: body.version || "1.0",
      preparePar: body.preparePar || "Responsable QHSE",
      validePar: body.validePar || "Direction QHSE",
      sourceMethodo: body.sourceMethodo || "Cimteranga — Plan d'Actions QSE (6.2.2)",
      sourceDocument: body.sourceDocument || "Grille_Analyse_Risques_QSE_Cas2_SahelLogistique.xlsx",
      sourcePlage: body.sourcePlage || "Feuille 'Analyse Risques'",
      isMissingData: Boolean(body.isMissingData),
      rows: body.rows || [
        {
          num: 1,
          processus: body.activite || "Travaux en hauteur",
          danger: "Chute de hauteur lors du montage d'échafaudage",
          effet: "Traumatisme grave ou décès de l'opérateur",
          cause: "Non-port du harnais de sécurité / ligne de vie défectueuse",
          mesures: "Inspection visuelle de l'EPI et vérification de la ligne de vie",
          f: "",
          g: "",
          d: "",
          actionsProposees: "Installer un filet de sécurité + formation obligatoire à l'ancrage",
          responsable: "Responsable Sécurité Chantier",
          echeance: "À définir",
          statut: "Proposée",
          commentaires: "Échelle à confirmer selon méthode de référence.",
        },
      ],
    };

    const wordBuffer = await generateAmdecWordBuffer(data);

    const fileName = `AMDEC_QHSE_${data.reference.replace(/[^a-zA-Z0-9_-]/g, "_")}_${data.date}.docx`;

    return new NextResponse(new Uint8Array(wordBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (err: any) {
    console.error("Erreur lors de la génération du rapport Word AMDEC:", err);
    return NextResponse.json(
      { error: "Impossible de générer le rapport Word AMDEC." },
      { status: 500 }
    );
  }
}
