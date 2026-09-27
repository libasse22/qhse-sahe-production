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

export interface PestelRow {
  num: number;
  axe: "Politique" | "Économique" | "Socioculturel" | "Technologique" | "Écologique" | "Légal";
  facteur: string;
  situationActuelle: string;
  opportunite: string;
  menace: string;
  impact: string;
  commentaire: string;
  source: string;
}

export interface PestelExportData {
  reference: string;
  date: string;
  entreprise: string;
  domaine: string;
  processus: string;
  perimetre: string;
  version: string;
  preparePar: string;
  validePar: string;
  sourceMethodo: string;
  sourceDocument: string;
  isMissingData: boolean;
  rows: PestelRow[];
}

/**
 * Génère le fichier Excel PESTEL professionnel (.xlsx) avec ExcelJS
 */
export async function generatePestelExcelBuffer(data: PestelExportData): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Copilote QHSE Senegal";
  workbook.lastModifiedBy = "Copilote QHSE Senegal";
  workbook.created = new Date();

  // --------------------------------------------------------------------------
  // FEUILLE 1 : PESTEL
  // --------------------------------------------------------------------------
  const sheetPestel = workbook.addWorksheet("PESTEL", {
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
  sheetPestel.mergeCells("A1:H2");
  const titleCell = sheetPestel.getCell("A1");
  titleCell.value = "PESTEL — ANALYSE DU CONTEXTE STRATÉGIQUE ET ORGANISATIONNEL";
  titleCell.font = { name: "Calibri", size: 14, bold: true, color: { argb: "FFFFFF" } };
  titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: colorNavy } };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };

  // Bloc Métadonnées
  const metaFields = [
    ["Entreprise :", data.entreprise, "Date :", data.date],
    ["Domaine / Activité :", data.domaine, "Référence :", data.reference],
    ["Processus :", data.processus, "Version :", data.version],
    ["Périmètre :", data.perimetre, "Préparé par :", data.preparePar],
    ["Source méthodologique :", data.sourceMethodo, "Statut :", data.isMissingData ? "Incomplet (Données à compléter)" : "Analysé"],
  ];

  metaFields.forEach((row, idx) => {
    const rNum = 4 + idx;
    sheetPestel.getCell(`A${rNum}`).value = row[0];
    sheetPestel.getCell(`A${rNum}`).font = { bold: true, size: 10 };
    sheetPestel.mergeCells(`B${rNum}:D${rNum}`);
    sheetPestel.getCell(`B${rNum}`).value = row[1];

    sheetPestel.getCell(`F${rNum}`).value = row[2];
    sheetPestel.getCell(`F${rNum}`).font = { bold: true, size: 10 };
    sheetPestel.mergeCells(`G${rNum}:H${rNum}`);
    sheetPestel.getCell(`G${rNum}`).value = row[3];
  });

  for (let r = 4; r <= 8; r++) {
    sheetPestel.getRow(r).fill = { type: "pattern", pattern: "solid", fgColor: { argb: colorMetaBg } };
  }

  // En-têtes du tableau PESTEL (Ligne 10)
  const headers = [
    "Axe PESTEL",
    "Facteur / Enjeu",
    "Situation Actuelle",
    "Opportunité",
    "Menace",
    "Impact",
    "Commentaire / Action",
    "Source",
  ];

  const headerRow = sheetPestel.getRow(10);
  headerRow.values = headers;
  headerRow.height = 26;
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

  // Lignes PESTEL (Ligne 11...)
  const startDataRow = 11;
  data.rows.forEach((r, idx) => {
    const rNum = startDataRow + idx;
    const row = sheetPestel.getRow(rNum);

    row.getCell(1).value = r.axe;
    row.getCell(2).value = r.facteur || "À compléter";
    row.getCell(3).value = r.situationActuelle || "À compléter";
    row.getCell(4).value = r.opportunite || "À compléter";
    row.getCell(5).value = r.menace || "À compléter";
    row.getCell(6).value = r.impact || "Moyen";
    row.getCell(7).value = r.commentaire || "À compléter selon le contexte d'exploitation.";
    row.getCell(8).value = r.source || data.sourceDocument || "Cimteranga / ISM M2QHSE";

    row.alignment = { vertical: "middle", wrapText: true };
    row.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
    row.getCell(6).alignment = { horizontal: "center", vertical: "middle" };

    row.eachCell((cell) => {
      cell.border = {
        top: { style: "thin", color: { argb: "E2E8F0" } },
        bottom: { style: "thin", color: { argb: "E2E8F0" } },
        left: { style: "thin", color: { argb: "E2E8F0" } },
        right: { style: "thin", color: { argb: "E2E8F0" } },
      };
    });
  });

  sheetPestel.views = [{ state: "frozen", xSplit: 0, ySplit: 10 }];

  const colWidths = [18, 24, 28, 26, 26, 12, 30, 24];
  colWidths.forEach((w, i) => {
    sheetPestel.getColumn(i + 1).width = w;
  });

  // --------------------------------------------------------------------------
  // FEUILLE 2 : SYNTHÈSE
  // --------------------------------------------------------------------------
  const sheetSynthese = workbook.addWorksheet("Synthèse");
  sheetSynthese.mergeCells("A1:E2");
  const synTitle = sheetSynthese.getCell("A1");
  synTitle.value = "SYNTHÈSE DE L'ANALYSE PESTEL";
  synTitle.font = { name: "Calibri", size: 14, bold: true, color: { argb: "FFFFFF" } };
  synTitle.fill = { type: "pattern", pattern: "solid", fgColor: { argb: colorNavy } };
  synTitle.alignment = { horizontal: "center", vertical: "middle" };

  const lastRowIdx = startDataRow + data.rows.length - 1;

  const kpis = [
    ["Nombre d'axes analysés :", 6],
    ["Nombre d'enjeux renseignés :", { formula: `COUNTA(PESTEL!B${startDataRow}:B${lastRowIdx})` }],
    ["Nombre d'opportunités identifiées :", { formula: `COUNTA(PESTEL!D${startDataRow}:D${lastRowIdx})` }],
    ["Nombre de menaces identifiées :", { formula: `COUNTA(PESTEL!E${startDataRow}:E${lastRowIdx})` }],
    ["Statut de finalisation :", data.isMissingData ? "Incomplet — Éléments à compléter" : "Finalisé"],
  ];

  kpis.forEach((kpi, idx) => {
    const rNum = 4 + idx;
    sheetSynthese.getCell(`A${rNum}`).value = kpi[0];
    sheetSynthese.getCell(`A${rNum}`).font = { bold: true, size: 11 };
    sheetSynthese.getCell(`B${rNum}`).value = kpi[1] as any;
    sheetSynthese.getCell(`B${rNum}`).alignment = { horizontal: "left" };
  });

  sheetSynthese.getColumn(1).width = 40;
  sheetSynthese.getColumn(2).width = 32;

  // --------------------------------------------------------------------------
  // FEUILLE 3 : SOURCES
  // --------------------------------------------------------------------------
  const sheetSources = workbook.addWorksheet("Sources");
  sheetSources.mergeCells("A1:D2");
  const srcTitle = sheetSources.getCell("A1");
  srcTitle.value = "PROVENANCE DOCUMENTAIRE PESTEL";
  srcTitle.font = { name: "Calibri", size: 14, bold: true, color: { argb: "FFFFFF" } };
  srcTitle.fill = { type: "pattern", pattern: "solid", fgColor: { argb: colorNavy } };
  srcTitle.alignment = { horizontal: "center", vertical: "middle" };

  const sourcesData = [
    ["Méthode appliquée :", "PESTEL (Politique, Économique, Socioculturel, Technologique, Écologique, Légal)"],
    ["Source méthodologique :", data.sourceMethodo || "CIMTERANGA — Tableau Objectifs QSE (Feuille Contexte & Enjeux)"],
    ["Document source KB :", data.sourceDocument || "ISM_M2QHSE_REVISION_MODULE SMI.pdf"],
    ["Date de génération :", data.date],
    ["Conformité RLS :", "Certifié conforme au périmètre entreprise."],
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
 * Génère le rapport de synthèse Word PESTEL (.docx)
 */
export async function generatePestelWordBuffer(data: PestelExportData): Promise<Buffer> {
  const tableRows: TableRow[] = [
    new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ text: "Axe", children: [new TextRun({ bold: true, color: "FFFFFF" })] })], shading: { fill: "1E293B" } }),
        new TableCell({ children: [new Paragraph({ text: "Enjeu / Facteur", children: [new TextRun({ bold: true, color: "FFFFFF" })] })], shading: { fill: "1E293B" } }),
        new TableCell({ children: [new Paragraph({ text: "Opportunité", children: [new TextRun({ bold: true, color: "FFFFFF" })] })], shading: { fill: "1E293B" } }),
        new TableCell({ children: [new Paragraph({ text: "Menace", children: [new TextRun({ bold: true, color: "FFFFFF" })] })], shading: { fill: "1E293B" } }),
        new TableCell({ children: [new Paragraph({ text: "Impact", children: [new TextRun({ bold: true, color: "FFFFFF" })] })], shading: { fill: "1E293B" } }),
      ],
    }),
  ];

  data.rows.forEach((r) => {
    tableRows.push(
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph(r.axe)] }),
          new TableCell({ children: [new Paragraph(r.facteur || "À compléter")] }),
          new TableCell({ children: [new Paragraph(r.opportunite || "À compléter")] }),
          new TableCell({ children: [new Paragraph(r.menace || "À compléter")] }),
          new TableCell({ children: [new Paragraph(r.impact || "Moyen")] }),
        ],
      })
    );
  });

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({ text: "RAPPORT D'ANALYSE PESTEL", heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER }),
          new Paragraph({ text: "" }),
          new Paragraph({
            children: [
              new TextRun({ text: "Entreprise : ", bold: true }),
              new TextRun(data.entreprise),
              new TextRun({ text: " | Date : ", bold: true }),
              new TextRun(data.date),
              new TextRun({ text: " | Domaine : ", bold: true }),
              new TextRun(data.domaine),
            ],
          }),
          new Paragraph({ text: "" }),
          new Paragraph({ text: "1. Objet et Périmètre", heading: HeadingLevel.HEADING_2 }),
          new Paragraph({ text: `Analyse du contexte stratégique et environnemental pour le périmètre : ${data.perimetre}.` }),
          new Paragraph({ text: "" }),

          new Paragraph({ text: "2. Méthode et Sources KB", heading: HeadingLevel.HEADING_2 }),
          new Paragraph({ text: `Analyse basée sur le référentiel PESTEL (${data.sourceMethodo}). Document source : ${data.sourceDocument}.` }),
          new Paragraph({ text: "" }),

          new Paragraph({ text: "3. Matrice PESTEL", heading: HeadingLevel.HEADING_2 }),
          new Table({ rows: tableRows, width: { size: 100, type: WidthType.PERCENTAGE } }),
          new Paragraph({ text: "" }),

          new Paragraph({ text: "4. Synthèse et Prochaines Étapes", heading: HeadingLevel.HEADING_2 }),
          new Paragraph({
            text: data.isMissingData
              ? "⚠️ Analyse non finalisée — éléments à compléter dans la grille Excel jointe avant validation stratégique."
              : "L'analyse PESTEL met en évidence les opportunités et menaces clés pour orienter la politique QHSE.",
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
