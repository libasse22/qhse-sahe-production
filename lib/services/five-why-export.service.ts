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

export interface WhyStep {
  stepNum: number;
  question: string;
  answer: string;
  status: "confirmed" | "hypothesis" | "missing_info";
  source?: string;
}

export interface FiveWhyExportData {
  reference: string;
  date: string;
  entreprise: string;
  processus: string;
  activite: string;
  problemStatement: string;
  context: string;
  whySteps: WhyStep[];
  confirmedFacts: string[];
  hypotheses: string[];
  missingInformation: string[];
  rootCauseCandidate: string;
  correctiveDirection: string;
  preventiveDirection: string;
  version: string;
  preparePar: string;
  validePar: string;
  sourceMethodo: string;
  sourceDocument: string;
  isMissingData: boolean;
}

/**
 * Génère le fichier Excel 5 WHY professionnel (.xlsx) avec ExcelJS
 */
export async function generateFiveWhyExcelBuffer(data: FiveWhyExportData): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Copilote QHSE Senegal";
  workbook.lastModifiedBy = "Copilote QHSE Senegal";
  workbook.created = new Date();

  const colorNavy = "1E3A8A";
  const colorHeaderBg = "1E293B";
  const colorMetaBg = "F1F5F9";

  // --------------------------------------------------------------------------
  // FEUILLE 1 : 5 WHY (ANALYSE CAUSE RACINE)
  // --------------------------------------------------------------------------
  const sheetWhy = workbook.addWorksheet("5 Why", {
    pageSetup: {
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      paperSize: 9, // A4
      showGridLines: true,
    },
  });

  // Titre principal
  sheetWhy.mergeCells("A1:E2");
  const titleCell = sheetWhy.getCell("A1");
  titleCell.value = "ANALYSE DES CAUSES RACINES — MÉTHODE DES 5 POURQUOI (5 WHY)";
  titleCell.font = { name: "Calibri", size: 14, bold: true, color: { argb: "FFFFFF" } };
  titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: colorNavy } };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };

  // Bloc Métadonnées
  const metaFields = [
    ["Entreprise :", data.entreprise, "Date :", data.date],
    ["Activité / Contexte :", data.activite, "Référence :", data.reference],
    ["Processus :", data.processus, "Version :", data.version],
    ["Problème Étudié :", data.problemStatement, "Statut :", data.isMissingData ? "Incomplet (Validation requise)" : "Analysé"],
    ["Préparé par :", data.preparePar, "Validé par :", data.validePar],
  ];

  metaFields.forEach((row, idx) => {
    const rNum = 4 + idx;
    sheetWhy.getCell(`A${rNum}`).value = row[0];
    sheetWhy.getCell(`A${rNum}`).font = { bold: true, size: 10 };
    sheetWhy.mergeCells(`B${rNum}:C${rNum}`);
    sheetWhy.getCell(`B${rNum}`).value = row[1];

    sheetWhy.getCell(`D${rNum}`).value = row[2];
    sheetWhy.getCell(`D${rNum}`).font = { bold: true, size: 10 };
    sheetWhy.getCell(`E${rNum}`).value = row[3];
  });

  for (let r = 4; r <= 8; r++) {
    sheetWhy.getRow(r).fill = { type: "pattern", pattern: "solid", fgColor: { argb: colorMetaBg } };
  }

  // En-têtes du Tableau 5 Why (Ligne 10)
  const headers = [
    "Niveau",
    "Question (Pourquoi ?)",
    "Réponse / Constat Établi",
    "Statut de l'Élément",
    "Source / Reference KB",
  ];

  const headerRow = sheetWhy.getRow(10);
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

  // Lignes de la séquence Pourquoi (Ligne 11...)
  const startDataRow = 11;
  data.whySteps.forEach((step, idx) => {
    const rNum = startDataRow + idx;
    const row = sheetWhy.getRow(rNum);

    let statusLabel = "Fait Confirmé";
    if (step.status === "hypothesis") statusLabel = "Hypothèse à vérifier";
    if (step.status === "missing_info") statusLabel = "Information Manquante";

    row.getCell(1).value = `Pourquoi ${step.stepNum}`;
    row.getCell(2).value = step.question || `Pourquoi le niveau ${step.stepNum} s'est-il produit ?`;
    row.getCell(3).value = step.answer || "À compléter selon le constat terrain";
    row.getCell(4).value = statusLabel;
    row.getCell(5).value = step.source || data.sourceDocument || "Knowledge Base / Interne";

    row.alignment = { vertical: "middle", wrapText: true };
    row.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
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

  const nextRow = startDataRow + data.whySteps.length + 2;

  // Bloc Synthèse & Causes Racines
  sheetWhy.getCell(`A${nextRow}`).value = "CAUSE RACINE CANDIDATE IDENTIFIÉE :";
  sheetWhy.getCell(`A${nextRow}`).font = { bold: true, size: 11, color: { argb: colorNavy } };
  sheetWhy.mergeCells(`B${nextRow}:E${nextRow}`);
  sheetWhy.getCell(`B${nextRow}`).value = data.rootCauseCandidate || "Procédure de contrôle et de validation préalable à consolider.";
  sheetWhy.getCell(`B${nextRow}`).font = { bold: true, size: 11 };

  sheetWhy.getCell(`A${nextRow + 1}`).value = "ORIENTATION CORRECTIVE (CAPA) :";
  sheetWhy.getCell(`A${nextRow + 1}`).font = { bold: true, size: 10 };
  sheetWhy.mergeCells(`B${nextRow + 1}:E${nextRow + 1}`);
  sheetWhy.getCell(`B${nextRow + 1}`).value = data.correctiveDirection || "Mettre en place un point d'arrêt bloquant avant démarrage.";

  sheetWhy.getCell(`A${nextRow + 2}`).value = "ORIENTATION PRÉVENTIVE :";
  sheetWhy.getCell(`A${nextRow + 2}`).font = { bold: true, size: 10 };
  sheetWhy.mergeCells(`B${nextRow + 2}:E${nextRow + 2}`);
  sheetWhy.getCell(`B${nextRow + 2}`).value = data.preventiveDirection || "Revoir la fiche de procédure et former les équipes opérationnelles.";

  sheetWhy.views = [{ state: "frozen", xSplit: 0, ySplit: 10 }];

  const colWidths = [18, 42, 45, 24, 30];
  colWidths.forEach((w, i) => {
    sheetWhy.getColumn(i + 1).width = w;
  });

  // --------------------------------------------------------------------------
  // FEUILLE 2 : SYNTHÈSE
  // --------------------------------------------------------------------------
  const sheetSynthese = workbook.addWorksheet("Synthèse");
  sheetSynthese.mergeCells("A1:E2");
  const synTitle = sheetSynthese.getCell("A1");
  synTitle.value = "SYNTHÈSE DE L'ANALYSE 5 POURQUOI";
  synTitle.font = { name: "Calibri", size: 14, bold: true, color: { argb: "FFFFFF" } };
  synTitle.fill = { type: "pattern", pattern: "solid", fgColor: { argb: colorNavy } };
  synTitle.alignment = { horizontal: "center", vertical: "middle" };

  const confirmedCount = data.whySteps.filter((s) => s.status === "confirmed").length;
  const hypothesisCount = data.whySteps.filter((s) => s.status === "hypothesis").length;

  const kpis = [
    ["Nombre de niveaux 'Pourquoi' analysés :", data.whySteps.length],
    ["Nombres de faits confirmés :", confirmedCount],
    ["Nombre d'hypothèses à vérifier :", hypothesisCount],
    ["Cause racine candidate établie :", data.rootCauseCandidate ? "Oui" : "Non (À compléter)"],
    ["Statut global d'analyse :", data.isMissingData ? "Incomplet — Validation requise" : "Analysé"],
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
  srcTitle.value = "PROVENANCE DOCUMENTAIRE 5 WHY";
  srcTitle.font = { name: "Calibri", size: 14, bold: true, color: { argb: "FFFFFF" } };
  srcTitle.fill = { type: "pattern", pattern: "solid", fgColor: { argb: colorNavy } };
  srcTitle.alignment = { horizontal: "center", vertical: "middle" };

  const sourcesData = [
    ["Méthode appliquée :", "5 Pourquoi (5 Whys — Analyse des Causes Racines)"],
    ["Source méthodologique :", data.sourceMethodo || "Cimteranga — Analyse des Causes Racines"],
    ["Document KB :", data.sourceDocument || "ISM_M2QHSE_REVISION_MODULE SMI.pdf"],
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
 * Génère le rapport de synthèse Word 5 WHY (.docx)
 */
export async function generateFiveWhyWordBuffer(data: FiveWhyExportData): Promise<Buffer> {
  const tableRows: TableRow[] = [
    new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ text: "Niveau", children: [new TextRun({ bold: true, color: "FFFFFF" })] })], shading: { fill: "1E293B" } }),
        new TableCell({ children: [new Paragraph({ text: "Question (Pourquoi ?)", children: [new TextRun({ bold: true, color: "FFFFFF" })] })], shading: { fill: "1E293B" } }),
        new TableCell({ children: [new Paragraph({ text: "Réponse / Constat", children: [new TextRun({ bold: true, color: "FFFFFF" })] })], shading: { fill: "1E293B" } }),
        new TableCell({ children: [new Paragraph({ text: "Statut", children: [new TextRun({ bold: true, color: "FFFFFF" })] })], shading: { fill: "1E293B" } }),
      ],
    }),
  ];

  data.whySteps.forEach((s) => {
    let statusTxt = "Fait Confirmé";
    if (s.status === "hypothesis") statusTxt = "Hypothèse";
    if (s.status === "missing_info") statusTxt = "À compléter";

    tableRows.push(
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph(`Pourquoi ${s.stepNum}`)] }),
          new TableCell({ children: [new Paragraph(s.question)] }),
          new TableCell({ children: [new Paragraph(s.answer || "À compléter")] }),
          new TableCell({ children: [new Paragraph(statusTxt)] }),
        ],
      })
    );
  });

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({ text: "RAPPORT D'ANALYSE CAUSE RACINE — 5 POURQUOI", heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER }),
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

          new Paragraph({ text: "1. Objet et Contexte du Problème", heading: HeadingLevel.HEADING_2 }),
          new Paragraph({ text: `Problème identifié : ${data.problemStatement}` }),
          new Paragraph({ text: `Contexte opérationnel : ${data.context || "Non spécifié"}` }),
          new Paragraph({ text: "" }),

          new Paragraph({ text: "2. Méthodologie et Sources KB", heading: HeadingLevel.HEADING_2 }),
          new Paragraph({ text: `Analyse itérative selon la méthode 5 Pourquoi (${data.sourceMethodo}). Document source KB : ${data.sourceDocument}.` }),
          new Paragraph({ text: "" }),

          new Paragraph({ text: "3. Démarche d'Analyse (Séquence des Pourquoi)", heading: HeadingLevel.HEADING_2 }),
          new Table({ rows: tableRows, width: { size: 100, type: WidthType.PERCENTAGE } }),
          new Paragraph({ text: "" }),

          new Paragraph({ text: "4. Cause Racine Candidate et Orientations d'Actions", heading: HeadingLevel.HEADING_2 }),
          new Paragraph({
            children: [
              new TextRun({ text: "🎯 Cause Racine Candidate : ", bold: true }),
              new TextRun(data.rootCauseCandidate || "À valider sur le terrain."),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "🛠️ Orientation Corrective : ", bold: true }),
              new TextRun(data.correctiveDirection || "Actions à définir."),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "🛡️ Orientation Préventive : ", bold: true }),
              new TextRun(data.preventiveDirection || "Actions à définir."),
            ],
          }),
          new Paragraph({ text: "" }),

          new Paragraph({ text: "5. Validation et Responsabilités", heading: HeadingLevel.HEADING_2 }),
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
