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

export interface SwotItem {
  type: "Force" | "Faiblesse" | "Opportunité" | "Menace";
  description: string;
  impact: string;
  priorite: string;
  source: string;
}

export interface SwotExportData {
  reference: string;
  date: string;
  entreprise: string;
  activite: string;
  perimetre: string;
  version: string;
  preparePar: string;
  validePar: string;
  sourceMethodo: string;
  sourceDocument: string;
  isMissingData: boolean;
  items: SwotItem[];
}

/**
 * Génère le fichier Excel SWOT professionnel (.xlsx) avec ExcelJS
 */
export async function generateSwotExcelBuffer(data: SwotExportData): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Copilote QHSE Senegal";
  workbook.lastModifiedBy = "Copilote QHSE Senegal";
  workbook.created = new Date();

  // --------------------------------------------------------------------------
  // FEUILLE 1 : SWOT (MATRICE 2x2 STYLISÉE ET TABLEAU DÉTAILLÉ)
  // --------------------------------------------------------------------------
  const sheetSwot = workbook.addWorksheet("SWOT", {
    pageSetup: {
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      paperSize: 9, // A4
      showGridLines: true,
    },
  });

  const colorNavy = "1E3A8A";
  const colorHeaderBg = "1E293B";
  const colorMetaBg = "F1F5F9";

  // Titre principal
  sheetSwot.mergeCells("A1:E2");
  const titleCell = sheetSwot.getCell("A1");
  titleCell.value = "SWOT — MATRICE STRATÉGIQUE (FORCES / FAIBLESSES / OPPORTUNITÉS / MENACES)";
  titleCell.font = { name: "Calibri", size: 14, bold: true, color: { argb: "FFFFFF" } };
  titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: colorNavy } };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };

  // Bloc Métadonnées
  const metaFields = [
    ["Entreprise :", data.entreprise, "Date :", data.date],
    ["Activité :", data.activite, "Référence :", data.reference],
    ["Périmètre :", data.perimetre, "Version :", data.version],
    ["Préparé par :", data.preparePar, "Validé par :", data.validePar],
    ["Source KB :", data.sourceMethodo, "Statut :", data.isMissingData ? "Incomplet — À compléter" : "Complété"],
  ];

  metaFields.forEach((row, idx) => {
    const rNum = 4 + idx;
    sheetSwot.getCell(`A${rNum}`).value = row[0];
    sheetSwot.getCell(`A${rNum}`).font = { bold: true, size: 10 };
    sheetSwot.getCell(`B${rNum}`).value = row[1];

    sheetSwot.getCell(`D${rNum}`).value = row[2];
    sheetSwot.getCell(`D${rNum}`).font = { bold: true, size: 10 };
    sheetSwot.getCell(`E${rNum}`).value = row[3];
  });

  for (let r = 4; r <= 8; r++) {
    sheetSwot.getRow(r).fill = { type: "pattern", pattern: "solid", fgColor: { argb: colorMetaBg } };
  }

  // En-têtes du Tableau SWOT (Ligne 10)
  const headers = [
    "Type (Axe)",
    "Description de l'Élément",
    "Impact",
    "Priorité",
    "Source / Commentaire",
  ];

  const headerRow = sheetSwot.getRow(10);
  headerRow.values = headers;
  headerRow.height = 26;
  headerRow.font = { name: "Calibri", size: 10, bold: true, color: { argb: "FFFFFF" } };
  headerRow.alignment = { horizontal: "center", vertical: "middle" };

  headerRow.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: colorHeaderBg } };
    cell.border = {
      top: { style: "thin", color: { argb: "94A3B8" } },
      bottom: { style: "medium", color: { argb: "0F172A" } },
      left: { style: "thin", color: { argb: "94A3B8" } },
      right: { style: "thin", color: { argb: "94A3B8" } },
    };
  });

  // Lignes de données SWOT
  const startDataRow = 11;
  data.items.forEach((item, idx) => {
    const rNum = startDataRow + idx;
    const row = sheetSwot.getRow(rNum);

    row.getCell(1).value = item.type;
    row.getCell(2).value = item.description || "À compléter";
    row.getCell(3).value = item.impact || "À compléter";
    row.getCell(4).value = item.priorite || "À compléter";
    row.getCell(5).value = item.source || data.sourceDocument || "ISM M2QHSE / SMI";

    row.alignment = { vertical: "middle", wrapText: true };
    row.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
    row.getCell(3).alignment = { horizontal: "center", vertical: "middle" };
    row.getCell(4).alignment = { horizontal: "center", vertical: "middle" };

    row.eachCell((cell) => {
      cell.border = {
        top: { style: "thin", color: { argb: "E2E8F0" } },
        bottom: { style: "thin", color: { argb: "E2E8F0" } },
        left: { style: "thin", color: { argb: "E2E8F0" } },
        right: { style: "thin", color: { argb: "E2E8F0" } },
      };
    });
  });

  sheetSwot.views = [{ state: "frozen", xSplit: 0, ySplit: 10 }];

  const colWidths = [18, 45, 18, 18, 35];
  colWidths.forEach((w, i) => {
    sheetSwot.getColumn(i + 1).width = w;
  });

  // --------------------------------------------------------------------------
  // FEUILLE 2 : SYNTHÈSE
  // --------------------------------------------------------------------------
  const sheetSynthese = workbook.addWorksheet("Synthèse");
  sheetSynthese.mergeCells("A1:E2");
  const synTitle = sheetSynthese.getCell("A1");
  synTitle.value = "SYNTHÈSE STRATÉGIQUE SWOT";
  synTitle.font = { name: "Calibri", size: 14, bold: true, color: { argb: "FFFFFF" } };
  synTitle.fill = { type: "pattern", pattern: "solid", fgColor: { argb: colorNavy } };
  synTitle.alignment = { horizontal: "center", vertical: "middle" };

  const lastRowIdx = startDataRow + data.items.length - 1;

  const kpis = [
    ["Nombre total d'éléments analysés :", data.items.length],
    ["Nombre de Forces :", { formula: `COUNTIF(SWOT!A${startDataRow}:A${lastRowIdx},"Force")` }],
    ["Nombre de Faiblesses :", { formula: `COUNTIF(SWOT!A${startDataRow}:A${lastRowIdx},"Faiblesse")` }],
    ["Nombre d'Opportunités :", { formula: `COUNTIF(SWOT!A${startDataRow}:A${lastRowIdx},"Opportunité")` }],
    ["Nombre de Menaces :", { formula: `COUNTIF(SWOT!A${startDataRow}:A${lastRowIdx},"Menace")` }],
    ["Statut de finalisation :", data.isMissingData ? "Incomplet — Éléments à compléter" : "Finalisé"],
  ];

  kpis.forEach((kpi, idx) => {
    const rNum = 4 + idx;
    sheetSynthese.getCell(`A${rNum}`).value = kpi[0];
    sheetSynthese.getCell(`A${rNum}`).font = { bold: true, size: 11 };
    sheetSynthese.getCell(`B${rNum}`).value = kpi[1] as any;
    sheetSynthese.getCell(`B${rNum}`).alignment = { horizontal: "left" };
  });

  sheetSynthese.getColumn(1).width = 38;
  sheetSynthese.getColumn(2).width = 30;

  // --------------------------------------------------------------------------
  // FEUILLE 3 : SOURCES
  // --------------------------------------------------------------------------
  const sheetSources = workbook.addWorksheet("Sources");
  sheetSources.mergeCells("A1:D2");
  const srcTitle = sheetSources.getCell("A1");
  srcTitle.value = "PROVENANCE DOCUMENTAIRE SWOT";
  srcTitle.font = { name: "Calibri", size: 14, bold: true, color: { argb: "FFFFFF" } };
  srcTitle.fill = { type: "pattern", pattern: "solid", fgColor: { argb: colorNavy } };
  srcTitle.alignment = { horizontal: "center", vertical: "middle" };

  const sourcesData = [
    ["Méthode appliquée :", "SWOT (Strengths, Weaknesses, Opportunities, Threats)"],
    ["Source méthodologique :", data.sourceMethodo || "ISM_M2QHSE_REVISION_MODULE SMI.pdf"],
    ["Document KB :", data.sourceDocument || "SUPPORT MODULE SMI.pdf"],
    ["Date de génération :", data.date],
    ["Statut RLS / Multi-tenant :", "Certifié conforme au périmètre entreprise."],
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
 * Génère le rapport de synthèse Word SWOT (.docx)
 */
export async function generateSwotWordBuffer(data: SwotExportData): Promise<Buffer> {
  const tableRows: TableRow[] = [
    new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ text: "Axe", children: [new TextRun({ bold: true, color: "FFFFFF" })] })], shading: { fill: "1E293B" } }),
        new TableCell({ children: [new Paragraph({ text: "Description", children: [new TextRun({ bold: true, color: "FFFFFF" })] })], shading: { fill: "1E293B" } }),
        new TableCell({ children: [new Paragraph({ text: "Impact", children: [new TextRun({ bold: true, color: "FFFFFF" })] })], shading: { fill: "1E293B" } }),
        new TableCell({ children: [new Paragraph({ text: "Priorité", children: [new TextRun({ bold: true, color: "FFFFFF" })] })], shading: { fill: "1E293B" } }),
      ],
    }),
  ];

  data.items.forEach((item) => {
    tableRows.push(
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph(item.type)] }),
          new TableCell({ children: [new Paragraph(item.description || "À compléter")] }),
          new TableCell({ children: [new Paragraph(item.impact || "À compléter")] }),
          new TableCell({ children: [new Paragraph(item.priorite || "À compléter")] }),
        ],
      })
    );
  });

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({ text: "RAPPORT D'ANALYSE STRATÉGIQUE SWOT", heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER }),
          new Paragraph({ text: "" }),
          new Paragraph({
            children: [
              new TextRun({ text: "Entreprise : ", bold: true }),
              new TextRun(data.entreprise),
              new TextRun({ text: " | Date : ", bold: true }),
              new TextRun(data.date),
              new TextRun({ text: " | Activité : ", bold: true }),
              new TextRun(data.activite),
            ],
          }),
          new Paragraph({ text: "" }),

          new Paragraph({ text: "1. Objet et Périmètre", heading: HeadingLevel.HEADING_2 }),
          new Paragraph({ text: `Évaluation diagnostique interne et externe pour le périmètre : ${data.perimetre}.` }),
          new Paragraph({ text: "" }),

          new Paragraph({ text: "2. Méthode et Sources KB", heading: HeadingLevel.HEADING_2 }),
          new Paragraph({ text: `Méthodologie SWOT basée sur les référentiels : ${data.sourceMethodo}.` }),
          new Paragraph({ text: "" }),

          new Paragraph({ text: "3. Matrice SWOT", heading: HeadingLevel.HEADING_2 }),
          new Table({ rows: tableRows, width: { size: 100, type: WidthType.PERCENTAGE } }),
          new Paragraph({ text: "" }),

          new Paragraph({ text: "4. Conclusion & Orientations Strategic", heading: HeadingLevel.HEADING_2 }),
          new Paragraph({
            text: data.isMissingData
              ? "⚠️ Analyse non finalisée — éléments à compléter dans la grille Excel avant validation."
              : "L'analyse SWOT permet de capitaliser sur les forces et opportunités tout en atténuant les faiblesses et menaces.",
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
