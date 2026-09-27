import { NextRequest, NextResponse } from "next/server";
import { generateSwotExcelBuffer, SwotExportData } from "@/lib/services/swot-export.service";

export async function POST(req: NextRequest) {
  try {
    const body: SwotExportData = await req.json();

    const data: SwotExportData = {
      reference: body.reference || `REF-2026-SWOT-01`,
      date: body.date || new Date().toISOString().split("T")[0],
      entreprise: body.entreprise || "QHSE Duo Sénégal",
      activite: body.activite || "Management Systémique QSE",
      perimetre: body.perimetre || "Global Entreprise",
      version: body.version || "1.0",
      preparePar: body.preparePar || "Responsable QHSE",
      validePar: body.validePar || "Direction QHSE",
      sourceMethodo: body.sourceMethodo || "Référentiel Système de Management Intégré (SMI)",
      sourceDocument: body.sourceDocument || "ISM_M2QHSE_REVISION_MODULE SMI.pdf",
      isMissingData: Boolean(body.isMissingData),
      items: body.items || [
        { type: "Force", description: "Engagement de la direction & Procédures GED formalisées", impact: "Élevé", priorite: "Haute", source: "Manuel SMI" },
        { type: "Force", description: "Copilote QHSE actif et intégration de la Base de Connaissances", impact: "Élevé", priorite: "Haute", source: "Copilote System" },
        { type: "Faiblesse", description: "Délais de clôture de certaines actions correctives (CAPA)", impact: "Moyen", priorite: "Moyenne", source: "Registre CAPA" },
        { type: "Faiblesse", description: "Suivi du calendrier d'étalonnage des équipements de mesure", impact: "Moyen", priorite: "Moyenne", source: "Registre Équipements" },
        { type: "Opportunité", description: "Certification intégrée ISO 9001 / 14001 / 45001", impact: "Critique", priorite: "Haute", source: "Revue de Direction" },
        { type: "Opportunité", description: "Automatisation des alertes et tableaux de bord temps réel", impact: "Élevé", priorite: "Haute", source: "Cockpit QHSE" },
        { type: "Menace", description: "Évolution rapide des exigences réglementaires et normatives", impact: "Élevé", priorite: "Haute", source: "Veille Réglementaire" },
        { type: "Menace", description: "Risques d'accidents du travail sur chantiers temporaires", impact: "Critique", priorite: "Haute", source: "Analyse des Incidents" }
      ],
    };

    const excelBuffer = await generateSwotExcelBuffer(data);

    const fileName = `SWOT_QHSE_${data.reference.replace(/[^a-zA-Z0-9_-]/g, "_")}_${data.date}.xlsx`;

    return new NextResponse(new Uint8Array(excelBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (err: any) {
    console.error("Erreur lors de la génération de l'export Excel SWOT:", err);
    return NextResponse.json(
      { error: "Impossible de générer le fichier Excel SWOT." },
      { status: 500 }
    );
  }
}
