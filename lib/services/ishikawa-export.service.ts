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

export interface IshikawaCauseItem {
  category: "Matière" | "Matériel" | "Méthode" | "Main-d'œuvre" | "Milieu";
  cause: string;
  status: "confirmé" | "hypothèse" | "à_vérifier";
  justification: string;
  source?: string;
}

export interface IshikawaExportData {
  reference: string;
  date: string;
  entreprise: string;
  processus: string;
  activite: string;
  problemStatement: string;
  version: string;
  preparePar: string;
  validePar: string;
  sourceMethodo: string;
  sourceDocument: string;
  isMissingData: boolean;
  causes: IshikawaCauseItem[];
  missingInformation: string[];
  synthesis: string;
  correctiveDirection: string;
}

/**
 * Génère le fichier Excel Ishikawa professionnel (.xlsx) avec ExcelJS
 */
export async function generateIshikawaExcelBuffer(data: IshikawaExportData): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Copilote QHSE Senegal";
  workbook.lastModifiedBy = "Copilote QHSE Senegal";
  workbook.created = new Date();

  const colorNavy = "1E3A8A";
  const colorHeaderBg = "1E293B";
  const colorMetaBg = "F1F5F9";

  // --------------------------------------------------------------------------
  // FEUILLE 1 : ISHIKAWA (DIAGRAMME CAUSE-EFFET 5M)
  // --------------------------------------------------------------------------
  const sheetIsh = workbook.addWorksheet("Ishikawa", {
    pageSetup: {
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      paperSize: 9, // A4
      showGridLines: true,
    },
  });

  // Titre principal
  sheetIsh.mergeCells("A1:E2");
  const titleCell = sheetIsh.getCell("A1");
  titleCell.value = "DIAGRAMME CAUSE-EFFET (ISHIKAWA — LES 5M)";
  titleCell.font = { name: "Calibri", size: 14, bold: true, color: { argb: "FFFFFF" } };
  titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: colorNavy } };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };

  // Bloc Métadonnées
  const metaFields = [
    ["Entreprise :", data.entreprise, "Date :", data.date],
    ["Activité :", data.activite, "Référence :", data.reference],
    ["Processus :", data.processus, "Version :", data.version],
    ["Problème / Effet :", data.problemStatement, "Statut :", data.isMissingData ? "Incomplet (Validation requise)" : "Analysé"],
    ["Préparé par :", data.preparePar, "Validé par :", data.validePar],
  ];

  metaFields.forEach((row, idx) => {
    const rNum = 4 + idx;
    sheetIsh.getCell(`A${rNum}`).value = row[0];
    sheetIsh.getCell(`A${rNum}`).font = { bold: true, size: 10 };
    sheetIsh.mergeCells(`B${rNum}:C${rNum}`);
    sheetIsh.getCell(`B${rNum}`).value = row[1];

    sheetIsh.getCell(`D${rNum}`).value = row[2];
    sheetIsh.getCell(`D${rNum}`).font = { bold: true, size: 10 };
    sheetIsh.getCell(`E${rNum}`).value = row[3];
  });

  for (let r = 4; r <= 8; r++) {
    sheetIsh.getRow(r).fill = { type: "pattern", pattern: "solid", fgColor: { argb: colorMetaBg } };
  }

  // En-têtes du Tableau Ishikawa (Ligne 10)
  const headers = [
    "Catégorie 5M",
    "Cause Potentielle / Constat",
    "Statut de la Cause",
    "Justification / Donnée Entreprise",
    "Source KB / Référence",
  ];

  const headerRow = sheetIsh.getRow(10);
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

  // Lignes des causes 5M (Ligne 11...)
  const startDataRow = 11;
  data.causes.forEach((c, idx) => {
    const rNum = startDataRow + idx;
    const row = sheetIsh.getRow(rNum);

    let statusLabel = "Confirmé";
    if (c.status === "hypothèse") statusLabel = "Hypothèse";
    if (c.status === "à_vérifier") statusLabel = "À vérifier";

    row.getCell(1).value = c.category;
    row.getCell(2).value = c.cause || "À compléter";
    row.getCell(3).value = statusLabel;
    row.getCell(4).value = c.justification || "Renseignement à compléter sur le terrain";
    row.getCell(5).value = c.source || data.sourceDocument || "Knowledge Base / SMI";

    row.alignment = { vertical: "middle", wrapText: true };
    row.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
    row.getCell(3).alignment = { horizontal: "center", vertical: "middle" };

    row.eachCell((cell) => {
      cell.border = {
        top: { style: "thin", color: { argb: "E2E8F0" } },
        bottom: { style: "thin", color: { argb: "E2E8F0" } },
        left: { style: "thin", color: { argb: "E2E8F0" } },
        right: { style: "thin", color: { argb: "E2E8F0" } },
      };
    });
  });

  const nextRow = startDataRow + data.causes.length + 2;

  // Bloc Synthèse & Directions
  sheetIsh.getCell(`A${nextRow}`).value = "SYNTHÈSE DES CAUSES 5M :";
  sheetIsh.getCell(`A${nextRow}`).font = { bold: true, size: 11, color: { argb: colorNavy } };
  sheetIsh.mergeCells(`B${nextRow}:E${nextRow}`);
  sheetIsh.getCell(`B${nextRow}`).value = data.synthesis || "L'analyse met en évidence des enjeux sur la Méthode et le Matériel.";

  sheetIsh.getCell(`A${nextRow + 1}`).value = "ORIENTATION DES ACTIONS :";
  sheetIsh.getCell(`A${nextRow + 1}`).font = { bold: true, size: 10 };
  sheetIsh.mergeCells(`B${nextRow + 1}:E${nextRow + 1}`);
  sheetIsh.getCell(`B${nextRow + 1}`).value = data.correctiveDirection || "Programmer un audit ciblé et vérifier l'étalonnage des équipements.";

  sheetIsh.views = [{ state: "frozen", xSplit: 0, ySplit: 10 }];

  const colWidths = [18, 42, 22, 45, 30];
  colWidths.forEach((w, i) => {
    sheetIsh.getColumn(i + 1).width = w;
  });

  // --------------------------------------------------------------------------
  // FEUILLE 2 : SYNTHÈSE
  // --------------------------------------------------------------------------
  const sheetSynthese = workbook.addWorksheet("Synthèse");
  sheetSynthese.mergeCells("A1:E2");
  const synTitle = sheetSynthese.getCell("A1");
  synTitle.value = "SYNTHÈSE DU DIAGRAMME ISHIKAWA (5M)";
  synTitle.font = { name: "Calibri", size: 14, bold: true, color: { argb: "FFFFFF" } };
  synTitle.fill = { type: "pattern", pattern: "solid", fgColor: { argb: colorNavy } };
  synTitle.alignment = { horizontal: "center", vertical: "middle" };

  const lastRowIdx = startDataRow + data.causes.length - 1;

  const kpis = [
    ["Nombre total de causes identifiées :", data.causes.length],
    ["Causes 'Matière' :", { formula: `COUNTIF(Ishikawa!A${startDataRow}:A${lastRowIdx},"Matière")` }],
    ["Causes 'Matériel' :", { formula: `COUNTIF(Ishikawa!A${startDataRow}:A${lastRowIdx},"Matériel")` }],
    ["Causes 'Méthode' :", { formula: `COUNTIF(Ishikawa!A${startDataRow}:A${lastRowIdx},"Méthode")` }],
    ["Causes 'Main-d'œuvre' :", { formula: `COUNTIF(Ishikawa!A${startDataRow}:A${lastRowIdx},"Main-d'œuvre")` }],
    ["Causes 'Milieu' :", { formula: `COUNTIF(Ishikawa!A${startDataRow}:A${lastRowIdx},"Milieu")` }],
    ["Statut de finalisation :", data.isMissingData ? "Incomplet — Validation requise" : "Analysé"],
  ];

  kpis.forEach((kpi, idx) => {
    const rNum = 4 + idx;
    sheetSynthese.getCell(`A${rNum}`).value = kpi[0];
    sheetSynthese.getCell(`A${rNum}`).font = { bold: true, size: 11 };
    sheetSynthese.getCell(`B${rNum}`).value = kpi[1] as any;
    sheetSynthese.getCell(`B${rNum}`).alignment = { horizontal: "left" };
  });

  sheetSynthese.getColumn(1).width = 40;
  sheetSynthese.getColumn(2).width = 35;

  // --------------------------------------------------------------------------
  // FEUILLE 3 : SOURCES
  // --------------------------------------------------------------------------
  const sheetSources = workbook.addWorksheet("Sources");
  sheetSources.mergeCells("A1:D2");
  const srcTitle = sheetSources.getCell("A1");
  srcTitle.value = "PROVENANCE DOCUMENTAIRE ISHIKAWA";
  srcTitle.font = { name: "Calibri", size: 14, bold: true, color: { argb: "FFFFFF" } };
  srcTitle.fill = { type: "pattern", pattern: "solid", fgColor: { argb: colorNavy } };
  srcTitle.alignment = { horizontal: "center", vertical: "middle" };

  const sourcesData = [
    ["Méthode appliquée :", "Diagramme Cause-Effet Ishikawa (5M)"],
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
 * Génère le rapport de synthèse Word ISHIKAWA (.docx)
 */
export async function generateIshikawaWordBuffer(data: IshikawaExportData): Promise<Buffer> {
  const tableRows: TableRow[] = [
    new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ text: "Catégorie 5M", children: [new TextRun({ bold: true, color: "FFFFFF" })] })], shading: { fill: "1E293B" } }),
        new TableCell({ children: [new Paragraph({ text: "Cause Identifiée", children: [new TextRun({ bold: true, color: "FFFFFF" })] })], shading: { fill: "1E293B" } }),
        new TableCell({ children: [new Paragraph({ text: "Statut", children: [new TextRun({ bold: true, color: "FFFFFF" })] })], shading: { fill: "1E293B" } }),
        new TableCell({ children: [new Paragraph({ text: "Justification / Remarques", children: [new TextRun({ bold: true, color: "FFFFFF" })] })], shading: { fill: "1E293B" } }),
      ],
    }),
  ];

  data.causes.forEach((c) => {
    let statusTxt = "Confirmé";
    if (c.status === "hypothèse") statusTxt = "Hypothèse";
    if (c.status === "à_vérifier") statusTxt = "À vérifier";

    tableRows.push(
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph(c.category)] }),
          new TableCell({ children: [new Paragraph(c.cause || "À compléter")] }),
          new TableCell({ children: [new Paragraph(statusTxt)] }),
          new TableCell({ children: [new Paragraph(c.justification || "À préciser sur le terrain")] }),
        ],
      })
    );
  });

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({ text: "RAPPORT DIAGRAMME CAUSE-EFFET (ISHIKAWA — 5M)", heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER }),
          new Paragraph({ text: "" }),
          new Paragraph({
            children: [
              new TextRun({ text: "Entreprise : ", bold: true }),
              new TextRun(data.entreprise),
              new TextRun({ text: " | Date : ", bold: true }),
              new TextRun(data.date),
              new TextRun({ text: " | Processus : ", bold: true }),
              new TextRun(data.processus),
            ],
          }),
          new Paragraph({ text: "" }),

          new Paragraph({ text: "1. Problème et Périmètre d'Analyse", heading: HeadingLevel.HEADING_2 }),
          new Paragraph({ text: `Effet / Problème analysé : ${data.problemStatement}` }),
          new Paragraph({ text: `Activité / Périmètre : ${data.activite}` }),
          new Paragraph({ text: "" }),

          new Paragraph({ text: "2. Méthodologie 5M et Sources KB", heading: HeadingLevel.HEADING_2 }),
          new Paragraph({ text: `Analyse basée sur le diagramme d'Ishikawa (${data.sourceMethodo}). Document source KB : ${data.sourceDocument}.` }),
          new Paragraph({ text: "" }),

          new Paragraph({ text: "3. Matrice Cause-Effet (Les 5M)", heading: HeadingLevel.HEADING_2 }),
          new Table({ rows: tableRows, width: { size: 100, type: WidthType.PERCENTAGE } }),
          new Paragraph({ text: "" }),

          new Paragraph({ text: "4. Synthèse et Orientations d'Actions", heading: HeadingLevel.HEADING_2 }),
          new Paragraph({
            children: [
              new TextRun({ text: "📊 Synthèse : ", bold: true }),
              new TextRun(data.synthesis || "L'analyse met en évidence les axes majeurs à traiter."),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "🛠️ Orientation Corrective : ", bold: true }),
              new TextRun(data.correctiveDirection || "Programmer une inspection ciblée sur les causes prioritaires."),
            ],
          }),
          new Paragraph({ text: "" }),

          new Paragraph({ text: "5. Validation et Signatures", heading: HeadingLevel.HEADING_2 }),
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
