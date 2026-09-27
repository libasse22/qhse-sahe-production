import { NextRequest, NextResponse } from "next/server";
import { generateIshikawaWordBuffer, IshikawaExportData } from "@/lib/services/ishikawa-export.service";

export async function POST(req: NextRequest) {
  try {
    const body: IshikawaExportData = await req.json();

    const data: IshikawaExportData = {
      reference: body.reference || `REF-2026-ISHIKAWA-01`,
      date: body.date || new Date().toISOString().split("T")[0],
      entreprise: body.entreprise || "QHSE Duo Sénégal",
      processus: body.processus || "Management Intégré QSE",
      activite: body.activite || "Analyse de non-conformité opérationnelle",
      problemStatement: body.problemStatement || "Écart de conformité ou défaut de qualité/sécurité",
      version: body.version || "1.0",
      preparePar: body.preparePar || "Responsable QHSE",
      validePar: body.validePar || "Direction QHSE",
      sourceMethodo: body.sourceMethodo || "Méthode des 5M (Ishikawa — Diagramme Cause-Effet)",
      sourceDocument: body.sourceDocument || "ISM_M2QHSE_REVISION_MODULE SMI.pdf",
      isMissingData: Boolean(body.isMissingData),
      causes: body.causes || [
        { category: "Matière", cause: "Conformité des consommables de sécurité", status: "confirmé", justification: "EPI conformes aux normes", source: "Registre Stock" },
        { category: "Matériel", cause: "Équipement d'outillage ou de mesure à contrôler", status: "à_vérifier", justification: "Date du dernier étalonnage à valider", source: "Registre Équipements" },
        { category: "Méthode", cause: "Respect de la procédure opératoire GED", status: "confirmé", justification: "Procédure affichée", source: "Manuel SMI" },
        { category: "Main-d'œuvre", cause: "Niveau de sensibilisation des opérateurs", status: "hypothèse", justification: "Nombre de causeries récentes à vérifier", source: "Bilan Formation" },
        { category: "Milieu", cause: "Conditions environnementales de la zone de travail", status: "confirmé", justification: "Éclairage et accès conformes", source: "Rapport d'Inspection" },
      ],
      missingInformation: body.missingInformation || ["Dates d'étalonnage exactes des instruments"],
      synthesis: body.synthesis || "Les causes principales se situent au niveau de la Méthode et du Matériel.",
      correctiveDirection: body.correctiveDirection || "Programmer une inspection ciblée de la zone et du matériel.",
    };

    const wordBuffer = await generateIshikawaWordBuffer(data);

    const fileName = `ISHIKAWA_QHSE_${data.reference.replace(/[^a-zA-Z0-9_-]/g, "_")}_${data.date}.docx`;

    return new NextResponse(new Uint8Array(wordBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (err: any) {
    console.error("Erreur lors de la génération du rapport Word Ishikawa:", err);
    return NextResponse.json(
      { error: "Impossible de générer le rapport Word Ishikawa." },
      { status: 500 }
    );
  }
}
