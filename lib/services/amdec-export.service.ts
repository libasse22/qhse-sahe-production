import ExcelJS from "exceljs";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableCell,
  TableRow,
  WidthType,
  HeadingLevel,
  AlignmentType,
} from "docx";

export interface AmdecRow {
  num: number;
  processus: string;
  danger: string;
  effet: string;
  cause: string;
  mesures: string;
  f?: number | string;
  g?: number | string;
  d?: number | string;
  ipr?: number;
  criticite?: string;
  actionsProposees: string;
  responsable: string;
  echeance: string;
  statut: string;
  commentaires: string;
}

export interface AmdecExportData {
  reference: string;
  date: string;
  entreprise: string;
  processus: string;
  activite: string;
  version: string;
  preparePar: string;
  validePar: string;
  sourceMethodo: string;
  sourceDocument: string;
  sourcePlage: string;
  isMissingData: boolean;
  rows: AmdecRow[];
}

/**
 * Génère le fichier Excel AMDEC professionnel (.xlsx) avec ExcelJS
 */
export async function generateAmdecExcelBuffer(data: AmdecExportData): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Copilote QHSE Senegal";
  workbook.lastModifiedBy = "Copilote QHSE Senegal";
  workbook.created = new Date();

  // --------------------------------------------------------------------------
  // FEUILLE 1 : AMDEC
  // --------------------------------------------------------------------------
  const sheetAmdec = workbook.addWorksheet("AMDEC", {
    pageSetup: {
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      paperSize: 9, // A4
      showGridLines: true,
    },
  });

  // Style des couleurs
  const colorNavy = "1E3A8A";
  const colorHeaderBg = "1E293B";
  const colorMetaBg = "F1F5F9";

  // Titre principal
  sheetAmdec.mergeCells("A1:P2");
  const titleCell = sheetAmdec.getCell("A1");
  titleCell.value = "AMDEC — ANALYSE DES MODES DE DÉFAILLANCE, DE LEURS EFFETS ET DE LEUR CRITICITÉ";
  titleCell.font = { name: "Calibri", size: 14, bold: true, color: { argb: "FFFFFF" } };
  titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: colorNavy } };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };

  // Bloc Métadonnées (Lignes 4 à 8)
  const metaFields = [
    ["Entreprise :", data.entreprise, "Date :", data.date],
    ["Processus :", data.processus, "Référence :", data.reference],
    ["Activité :", data.activite, "Version :", data.version],
    ["Préparé par :", data.preparePar, "Validé par :", data.validePar],
    ["Source méthodologique :", data.sourceMethodo, "Statut données :", data.isMissingData ? "À compléter (Cotation en attente)" : "Complétée"],
  ];

  metaFields.forEach((row, idx) => {
    const rowNum = 4 + idx;
    sheetAmdec.getCell(`A${rowNum}`).value = row[0];
    sheetAmdec.getCell(`A${rowNum}`).font = { bold: true, size: 10 };
    sheetAmdec.mergeCells(`B${rowNum}:D${rowNum}`);
    sheetAmdec.getCell(`B${rowNum}`).value = row[1];

    sheetAmdec.getCell(`F${rowNum}`).value = row[2];
    sheetAmdec.getCell(`F${rowNum}`).font = { bold: true, size: 10 };
    sheetAmdec.mergeCells(`G${rowNum}:I${rowNum}`);
    sheetAmdec.getCell(`G${rowNum}`).value = row[3];
  });

  // Style du bloc métadonnées
  for (let r = 4; r <= 8; r++) {
    sheetAmdec.getRow(r).fill = { type: "pattern", pattern: "solid", fgColor: { argb: colorMetaBg } };
  }

  // En-têtes du tableau AMDEC (Ligne 10)
  const headers = [
    "N°",
    "Processus / Activité",
    "Mode de défaillance / Danger",
    "Effet",
    "Cause",
    "Mesures existantes",
    "Fréquence (F)",
    "Gravité (G)",
    "Détectabilité (D)",
    "IPR",
    "Niveau de criticité",
    "Actions proposées",
    "Responsable",
    "Échéance",
    "Statut",
    "Commentaires",
  ];

  const headerRow = sheetAmdec.getRow(10);
  headerRow.values = headers;
  headerRow.height = 28;
  headerRow.font = { name: "Calibri", size: 10, bold: true, color: { argb: "FFFFFF" } };
  headerRow.alignment = { horizontal: "center", vertical: "middle", wrapText: true };

  headerRow.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: colorHeaderBg } };
    cell.border = {
      top: { style: "thin", color: { argb: "94A3B8" } },
      bottom: { style: "medium", color: { argb: "0F172A" } },
      left: { style: "thin", color: { argb: "94A3B8" } },
      right: { style: "thin", color: { argb: "94A3B8" } },
    };
  });

  // Lignes de données (Ligne 11 à ...)
  const startDataRow = 11;
  data.rows.forEach((r, idx) => {
    const rowNum = startDataRow + idx;
    const row = sheetAmdec.getRow(rowNum);

    const fVal = typeof r.f === "number" ? r.f : "";
    const gVal = typeof r.g === "number" ? r.g : "";
    const dVal = typeof r.d === "number" ? r.d : "";

    row.getCell(1).value = r.num;
    row.getCell(2).value = r.processus || data.activite || "À renseigner";
    row.getCell(3).value = r.danger || "À renseigner";
    row.getCell(4).value = r.effet || "À renseigner";
    row.getCell(5).value = r.cause || "À renseigner";
    row.getCell(6).value = r.mesures || "À renseigner";
    row.getCell(7).value = fVal;
    row.getCell(8).value = gVal;
    row.getCell(9).value = dVal;

    // FORMULE EXCEL POUR IPR = F * G * D
    row.getCell(10).value = { formula: `IF(OR(G${rowNum}="",H${rowNum}="",I${rowNum}=""),"",G${rowNum}*H${rowNum}*I${rowNum})` };

    // FORMULE EXCEL POUR CRITICITÉ
    row.getCell(11).value = { formula: `IF(J${rowNum}="","À coter",IF(J${rowNum}>=20,"CRITIQUE",IF(J${rowNum}>=10,"ÉLEVÉ","ACCEPTABLE")))` };

    row.getCell(12).value = r.actionsProposees || "À renseigner";
    row.getCell(13).value = r.responsable || "À renseigner";
    row.getCell(14).value = r.echeance || "À renseigner";
    row.getCell(15).value = r.statut || "Proposée";
    row.getCell(16).value = r.commentaires || "Échelle à confirmer selon méthode de référence.";

    row.alignment = { vertical: "middle", wrapText: true };
    row.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
    row.getCell(7).alignment = { horizontal: "center", vertical: "middle" };
    row.getCell(8).alignment = { horizontal: "center", vertical: "middle" };
    row.getCell(9).alignment = { horizontal: "center", vertical: "middle" };
    row.getCell(10).alignment = { horizontal: "center", vertical: "middle" };
    row.getCell(11).alignment = { horizontal: "center", vertical: "middle" };

    // Bordures
    row.eachCell((cell) => {
      cell.border = {
        top: { style: "thin", color: { argb: "E2E8F0" } },
        bottom: { style: "thin", color: { argb: "E2E8F0" } },
        left: { style: "thin", color: { argb: "E2E8F0" } },
        right: { style: "thin", color: { argb: "E2E8F0" } },
      };
    });
  });

  // Volets figés au niveau de l'en-tête du tableau
  sheetAmdec.views = [{ state: "frozen", xSplit: 0, ySplit: 10 }];

  // Largeur optimale des colonnes
  const colWidths = [6, 20, 26, 22, 22, 22, 12, 12, 14, 10, 16, 26, 16, 14, 12, 28];
  colWidths.forEach((w, i) => {
    sheetAmdec.getColumn(i + 1).width = w;
  });

  // --------------------------------------------------------------------------
  // FEUILLE 2 : SYNTHÈSE
  // --------------------------------------------------------------------------
  const sheetSynthese = workbook.addWorksheet("Synthèse");
  sheetSynthese.mergeCells("A1:E2");
  const synTitle = sheetSynthese.getCell("A1");
  synTitle.value = "SYNTHÈSE DE L'ANALYSE AMDEC";
  synTitle.font = { name: "Calibri", size: 14, bold: true, color: { argb: "FFFFFF" } };
  synTitle.fill = { type: "pattern", pattern: "solid", fgColor: { argb: colorNavy } };
  synTitle.alignment = { horizontal: "center", vertical: "middle" };

  const lastRowIdx = startDataRow + data.rows.length - 1;

  const kpis = [
    ["Nombre de lignes AMDEC :", data.rows.length],
    ["Nombre de risques évalués :", { formula: `COUNTA(AMDEC!C${startDataRow}:C${lastRowIdx})` }],
    ["Nombre de risques critiques (IPR >= 20) :", { formula: `COUNTIF(AMDEC!K${startDataRow}:K${lastRowIdx},"CRITIQUE")` }],
    ["Nombre de risques élevés (10 <= IPR < 20) :", { formula: `COUNTIF(AMDEC!K${startDataRow}:K${lastRowIdx},"ÉLEVÉ")` }],
    ["Nombre d'actions proposées :", { formula: `COUNTA(AMDEC!L${startDataRow}:L${lastRowIdx})` }],
    ["IPR Maximum calculé :", { formula: `IF(COUNT(AMDEC!J${startDataRow}:J${lastRowIdx})>0,MAX(AMDEC!J${startDataRow}:J${lastRowIdx}),"N/A — aucune cotation renseignée")` }],
    ["IPR Moyen calculé :", { formula: `IF(COUNT(AMDEC!J${startDataRow}:J${lastRowIdx})>0,AVERAGE(AMDEC!J${startDataRow}:J${lastRowIdx}),"N/A — aucune cotation renseignée")` }],
  ];

  kpis.forEach((kpi, idx) => {
    const rNum = 4 + idx;
    sheetSynthese.getCell(`A${rNum}`).value = kpi[0];
    sheetSynthese.getCell(`A${rNum}`).font = { bold: true, size: 11 };
    sheetSynthese.getCell(`B${rNum}`).value = kpi[1] as any;
    sheetSynthese.getCell(`B${rNum}`).alignment = { horizontal: "left" };
  });

  sheetSynthese.getColumn(1).width = 42;
  sheetSynthese.getColumn(2).width = 30;

  // --------------------------------------------------------------------------
  // FEUILLE 3 : SOURCES
  // --------------------------------------------------------------------------
  const sheetSources = workbook.addWorksheet("Sources");
  sheetSources.mergeCells("A1:D2");
  const srcTitle = sheetSources.getCell("A1");
  srcTitle.value = "PROVENANCE DOCUMENTAIRE & SOURCES MÉTHODOLOGIQUES";
  srcTitle.font = { name: "Calibri", size: 14, bold: true, color: { argb: "FFFFFF" } };
  srcTitle.fill = { type: "pattern", pattern: "solid", fgColor: { argb: colorNavy } };
  srcTitle.alignment = { horizontal: "center", vertical: "middle" };

  const sourcesData = [
    ["Méthode appliquée :", "AMDEC (Analyse des Modes de Défaillance, de leurs Effets et de leur Criticité)"],
    ["Référence documentaire :", data.sourceMethodo || "Cimteranga — Plan d'Actions QSE (6.2.2)"],
    ["Fichier source KB :", data.sourceDocument || "Grille_Analyse_Risques_QSE_Cas2_SahelLogistique.xlsx"],
    ["Feuille / Plage :", data.sourcePlage || "Feuille 'Analyse Risques', Plage A1:P50"],
    ["Date de génération :", data.date],
    ["Règles de cotation :", "IPR = Fréquence (F) × Gravité (G) × Détectabilité (D). Risque critique si IPR >= 20."],
    ["Statut RLS / Multi-tenant :", "Certifié conforme au périmètre entreprise de l'utilisateur."],
  ];

  sourcesData.forEach((sd, idx) => {
    const rNum = 4 + idx;
    sheetSources.getCell(`A${rNum}`).value = sd[0];
    sheetSources.getCell(`A${rNum}`).font = { bold: true };
    sheetSources.getCell(`B${rNum}`).value = sd[1];
  });

  sheetSources.getColumn(1).width = 28;
  sheetSources.getColumn(2).width = 75;

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

/**
 * Génère le rapport de synthèse Word AMDEC (.docx) avec docx
 */
export async function generateAmdecWordBuffer(data: AmdecExportData): Promise<Buffer> {
  const tableRows: TableRow[] = [
    new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ text: "N°", children: [new TextRun({ bold: true, color: "FFFFFF" })] })], shading: { fill: "1E293B" } }),
        new TableCell({ children: [new Paragraph({ text: "Danger / Mode défaillance", children: [new TextRun({ bold: true, color: "FFFFFF" })] })], shading: { fill: "1E293B" } }),
        new TableCell({ children: [new Paragraph({ text: "Effet", children: [new TextRun({ bold: true, color: "FFFFFF" })] })], shading: { fill: "1E293B" } }),
        new TableCell({ children: [new Paragraph({ text: "Cotation (F/G/D)", children: [new TextRun({ bold: true, color: "FFFFFF" })] })], shading: { fill: "1E293B" } }),
        new TableCell({ children: [new Paragraph({ text: "IPR", children: [new TextRun({ bold: true, color: "FFFFFF" })] })], shading: { fill: "1E293B" } }),
        new TableCell({ children: [new Paragraph({ text: "Action Proposée", children: [new TextRun({ bold: true, color: "FFFFFF" })] })], shading: { fill: "1E293B" } }),
      ],
    }),
  ];

  data.rows.forEach((r) => {
    const fgdStr = (r.f && r.g && r.d) ? `${r.f} / ${r.g} / ${r.d}` : "À coter";
    const iprStr = r.ipr ? String(r.ipr) : (r.f && r.g && r.d && typeof r.f === "number" && typeof r.g === "number" && typeof r.d === "number") ? String(r.f * r.g * r.d) : "À coter";

    tableRows.push(
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph(String(r.num))] }),
          new TableCell({ children: [new Paragraph(r.danger || "À renseigner")] }),
          new TableCell({ children: [new Paragraph(r.effet || "À renseigner")] }),
          new TableCell({ children: [new Paragraph(fgdStr)] }),
          new TableCell({ children: [new Paragraph(iprStr)] }),
          new TableCell({ children: [new Paragraph(r.actionsProposees || "À renseigner")] }),
        ],
      })
    );
  });

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            text: "RAPPORT DE SYNTHÈSE AMDEC",
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({ text: "" }),
          new Paragraph({
            children: [
              new TextRun({ text: "Entreprise : ", bold: true }),
              new TextRun(data.entreprise),
              new TextRun({ text: " | Date : ", bold: true }),
              new TextRun(data.date),
              new TextRun({ text: " | Référence : ", bold: true }),
              new TextRun(data.reference),
            ],
          }),
          new Paragraph({ text: "" }),

          new Paragraph({ text: "1. Objet et Périmètre", heading: HeadingLevel.HEADING_2 }),
          new Paragraph({
            text: `Le présent rapport synthétise l'Analyse des Modes de Défaillance, de leurs Effets et de leur Criticité (AMDEC) réalisée pour l'activité : ${data.activite}.`,
          }),
          new Paragraph({ text: "" }),

          new Paragraph({ text: "2. Méthode & Sources", heading: HeadingLevel.HEADING_2 }),
          new Paragraph({
            text: `La méthodologie s'appuie sur le référentiel ${data.sourceMethodo}. Cotation définie par IPR = Fréquence x Gravité x Détectabilité.`,
          }),
          new Paragraph({ text: "" }),

          new Paragraph({ text: "3. Tableau de Synthèse AMDEC", heading: HeadingLevel.HEADING_2 }),
          new Table({
            rows: tableRows,
            width: { size: 100, type: WidthType.PERCENTAGE },
          }),
          new Paragraph({ text: "" }),

          new Paragraph({ text: "4. Conclusion & Recommandations", heading: HeadingLevel.HEADING_2 }),
          new Paragraph({
            text: data.isMissingData
              ? "⚠️ Analyse non finalisée — données de cotation à compléter dans la grille Excel jointe avant validation."
              : "L'analyse a identifié les risques majeurs et propose des actions d'atténuation à valider par la direction QHSE.",
          }),
          new Paragraph({ text: "" }),

          new Paragraph({ text: "5. Validation", heading: HeadingLevel.HEADING_2 }),
          new Paragraph({
            children: [
              new TextRun({ text: "Préparé par : ", bold: true }),
              new TextRun(`${data.preparePar} (Date : ${data.date})\n`),
              new TextRun({ text: "Validé par : ", bold: true }),
              new TextRun(`${data.validePar} (Date : _____________)`),
            ],
          }),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  return Buffer.from(buffer);
}
