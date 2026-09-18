"use server";

import * as mammoth from "mammoth";
import * as XLSX from "xlsx";
import { createClient } from "@/lib/supabase/server";
import type {
  KnowledgeDomain,
  KnowledgeChunkType,
} from "@/lib/types/knowledge";

// ----------------------------------------------------------------------------
// 1. ENGINE DE CLASSIFICATION AUTOMATIQUE METIER QHSE
// ----------------------------------------------------------------------------

const METHOD_KEYWORDS: Record<string, string[]> = {
  "AMDEC": ["amdec", "fmea", "mode de défaillance", "criticalité", "rpn"],
  "PESTEL": ["pestel", "politique économique", "socioculturel", "technologique"],
  "SWOT": ["swot", "forces faiblesses", "opportunités menaces", "ffom"],
  "Ishikawa": ["ishikawa", "5m", "cause effet", "arête de poisson"],
  "5 Pourquoi": ["5 pourquoi", "5 whys", "cinq pourquoi"],
  "QQOQCCP": ["qqoqccp", "qui quoi où quand comment pourquoi"],
  "RACI": ["raci", "responsable realise", "approbateur", "consulte", "informe"],
  "KPI / KRI": ["kpi", "kri", "indicateur clé", "tableau de bord"],
  "Analyse des Risques": ["analyse des risques", "evrp", "document unique", "duer", "cotation risque"],
  "HAZOP": ["hazop", "mots guides", "déviation procédé"],
  "5S": ["5s", "seiri", "seiton", "seiso", "seiketsu", "shitsuke"],
  "PDCA / Deming": ["pdca", "plan do check act", "roue de deming"],
};

const DOMAIN_KEYWORDS: Record<KnowledgeDomain, string[]> = {
  quality: ["qualité", "iso 9001", "satisfaction client", "non-conformité", "revue de direction"],
  health_safety: ["santé", "sécurité", "hse", "sst", "iso 45001", "epi", "accident", "danger", "permis de travail"],
  environment: ["environnement", "iso 14001", "déchets", "pollution", "carbone", "aspects environnementaux"],
  risk: ["risque", "cartographie", "gravité", "probabilité", "maîtrise"],
  audit: ["audit", "constat", "écart", "preuve", "référentiel"],
  management: ["management", "politique", "objectif", "leadership", "processus"],
  compliance: ["conformité", "réglementation", "code du travail", "législation", "exigence"],
  incident: ["incident", "presqu'accident", "déclaration", "enquête", "arbre des causes"],
  emergency: ["urgence", "poi", "puer", "évacuation", "secours", "incendie"],
  training: ["formation", "causerie", "toolbox", "habilitation", "compétence"],
  other: [],
};

export async function detectQhseMethods(text: string): Promise<string[]> {
  const lower = text.toLowerCase();
  const detected: string[] = [];

  for (const [method, keywords] of Object.entries(METHOD_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      detected.push(method);
    }
  }

  return detected;
}

export async function detectQhseDomain(text: string): Promise<KnowledgeDomain> {
  const lower = text.toLowerCase();
  let bestDomain: KnowledgeDomain = "other";
  let maxMatches = 0;

  for (const [domainKey, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
    if (domainKey === "other") continue;
    const count = keywords.filter((kw) => lower.includes(kw)).length;
    if (count > maxMatches) {
      maxMatches = count;
      bestDomain = domainKey as KnowledgeDomain;
    }
  }

  return bestDomain;
}

// ----------------------------------------------------------------------------
// 2. PARSERS PAR FORMAT DE FICHIER
// ----------------------------------------------------------------------------

export interface ExtractedSection {
  title?: string;
  heading?: string;
  section?: string;
  page?: number;
  sheetName?: string;
  cellRange?: string;
  contentType: KnowledgeChunkType;
  content: string;
}

/** Extracteur PDF avec conservation des numéros de pages et sections */
export async function parsePdfBuffer(buffer: Buffer): Promise<ExtractedSection[]> {
  const pdfParse = require("pdf-parse");
  const sections: ExtractedSection[] = [];

  const pdfData = await pdfParse(buffer, {
    pagerender: (pageData: any) => {
      return pageData.getTextContent().then((textContent: any) => {
        let lastY, text = "";
        for (const item of textContent.items) {
          if (lastY === item.transform[5] || !lastY) {
            text += item.str + " ";
          } else {
            text += "\n" + item.str + " ";
          }
          lastY = item.transform[5];
        }
        return text;
      });
    },
  });

  const rawPages = pdfData.text.split(/\f|\n{3,}/);
  let pageNum = 1;

  for (const pageText of rawPages) {
    const clean = pageText.trim();
    if (!clean) {
      pageNum++;
      continue;
    }

    const lines = clean.split("\n").map((l: string) => l.trim()).filter(Boolean);
    let currentHeading = `Page ${pageNum}`;
    let currentChunkText: string[] = [];

    for (const line of lines) {
      if (line.length < 80 && (line.endsWith(":") || line.match(/^[0-9A-Z\s\.\-]{3,50}$/))) {
        if (currentChunkText.length > 0) {
          sections.push({
            page: pageNum,
            heading: currentHeading,
            contentType: currentChunkText.join(" ").includes("|") ? "table" : "text",
            content: currentChunkText.join("\n"),
          });
          currentChunkText = [];
        }
        currentHeading = line;
      } else {
        currentChunkText.push(line);
      }
    }

    if (currentChunkText.length > 0) {
      sections.push({
        page: pageNum,
        heading: currentHeading,
        contentType: currentChunkText.join(" ").includes("|") ? "table" : "text",
        content: currentChunkText.join("\n"),
      });
    }

    pageNum++;
  }

  return sections.length > 0
    ? sections
    : [{ page: 1, heading: "Document PDF", contentType: "text", content: pdfData.text.trim() }];
}

/** Extracteur DOCX via Mammoth */
export async function parseDocxBuffer(buffer: Buffer): Promise<ExtractedSection[]> {
  const sections: ExtractedSection[] = [];
  const result = await mammoth.extractRawText({ buffer });
  const rawText = result.value || "";

  const lines = rawText.split("\n").map((l: string) => l.trim()).filter(Boolean);
  let currentHeading = "Section Principale";
  let currentParagraphs: string[] = [];

  for (const line of lines) {
    if (line.match(/^[0-9]\.|\b[A-Z\s]{4,60}\b$/) && line.length < 70) {
      if (currentParagraphs.length > 0) {
        sections.push({
          heading: currentHeading,
          section: currentHeading,
          contentType: "text",
          content: currentParagraphs.join("\n"),
        });
        currentParagraphs = [];
      }
      currentHeading = line;
    } else {
      currentParagraphs.push(line);
    }
  }

  if (currentParagraphs.length > 0) {
    sections.push({
      heading: currentHeading,
      section: currentHeading,
      contentType: "text",
      content: currentParagraphs.join("\n"),
    });
  }

  return sections;
}

/** Extracteur EXCEL Spécifique (SheetJS) — Feuilles, Plages, Formules & Matrices */
export async function parseExcelBuffer(buffer: Buffer): Promise<ExtractedSection[]> {
  const workbook = XLSX.read(buffer, { type: "buffer", cellFormula: true, cellDates: true });
  const sections: ExtractedSection[] = [];

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) continue;

    const ref = worksheet["!ref"] || "A1:A1";
    const jsonData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false });

    if (!jsonData || jsonData.length === 0) continue;

    // Détection d'en-têtes et de matrice
    const headers = (jsonData[0] || []).map((h) => String(h || "").trim());
    const rowCount = jsonData.length;
    const colCount = Math.max(...jsonData.map((r) => (r ? r.length : 0)));

    let sheetSummaryText = `=== FEUILLE EXCEL: ${sheetName} (Plage: ${ref}, Dimensions: ${rowCount}x${colCount}) ===\n`;
    if (headers.filter(Boolean).length > 0) {
      sheetSummaryText += `En-têtes détectés: ${headers.filter(Boolean).join(" | ")}\n\n`;
    }

    // Traitement des lignes par blocs
    const blockSize = 20;
    for (let i = 0; i < jsonData.length; i += blockSize) {
      const slice = jsonData.slice(i, i + blockSize);
      const startRow = i + 1;
      const endRow = Math.min(i + blockSize, jsonData.length);
      const cellRange = `A${startRow}:${XLSX.utils.encode_col(colCount - 1)}${endRow}`;

      const textRows: string[] = [];
      const formulas: string[] = [];

      for (let rIdx = 0; rIdx < slice.length; rIdx++) {
        const row = slice[rIdx];
        if (!row || row.every((c: any) => c === null || c === undefined || String(c).trim() === "")) continue;

        const rowLine = row.map((cell: any) => (cell !== null && cell !== undefined ? String(cell).trim() : "")).join(" | ");
        textRows.push(`Ligne ${startRow + rIdx}: ${rowLine}`);
      }

      // Extraction des formules clés de la plage
      for (const key of Object.keys(worksheet)) {
        if (key.startsWith("!")) continue;
        const cell = worksheet[key];
        if (cell && cell.f) {
          formulas.push(`${key} = ${cell.f} (${cell.v ?? ""})`);
        }
      }

      let content = `${sheetSummaryText}Données (Lignes ${startRow} à ${endRow}) :\n${textRows.join("\n")}`;
      if (formulas.length > 0 && i === 0) {
        content += `\n\nFormules Excel détectées :\n${formulas.slice(0, 10).join("\n")}`;
      }

      if (textRows.length > 0) {
        sections.push({
          sheetName,
          cellRange,
          heading: `Feuille ${sheetName} [${cellRange}]`,
          contentType: headers.length > 1 ? "matrix" : "table",
          content,
        });
      }
    }
  }

  return sections;
}

/** Extracteur TXT / Markdown */
export async function parseTextBuffer(text: string): Promise<ExtractedSection[]> {
  const sections: ExtractedSection[] = [];
  const blocks = text.split(/\n(?=#+\s|\b[0-9]\.|\b[A-Z\s]{4,40}:)/);

  let idx = 1;
  for (const block of blocks) {
    const clean = block.trim();
    if (!clean) continue;

    const firstLine = clean.split("\n")[0].replace(/^#+\s*/, "").trim();
    const isCode = clean.includes("```");
    const isTable = clean.includes("|");

    sections.push({
      heading: firstLine.length < 60 ? firstLine : `Section ${idx}`,
      section: firstLine.length < 60 ? firstLine : `Section ${idx}`,
      contentType: isTable ? "table" : isCode ? "procedure" : "text",
      content: clean,
    });
    idx++;
  }

  return sections;
}

// ----------------------------------------------------------------------------
// 3. SERVICE PRINCIPAL D'INGESTION ET CHUNKING
// ----------------------------------------------------------------------------

export async function ingestKnowledgeSource(
  sourceId: string,
  providedBuffer?: Buffer
): Promise<{ success: boolean; chunkCount?: number; error?: string }> {
  const supabase = await createClient();

  // 1. Récupération de la source
  const { data: source, error: fetchErr } = await supabase
    .from("knowledge_sources")
    .select("*")
    .eq("id", sourceId)
    .single();

  if (fetchErr || !source) return { success: false, error: "Source de connaissances introuvable." };

  try {
    let extractedSections: ExtractedSection[] = [];
    let fileBuffer: Buffer | null = providedBuffer || null;

    if (!fileBuffer && source.file_path) {
      // Téléchargement depuis le storage Supabase privatise
      const { data: fileData, error: downloadErr } = await supabase.storage
        .from("qhse-documents")
        .download(source.file_path);

      if (downloadErr || !fileData) {
        throw new Error(`Impossible de lire le fichier depuis le storage: ${downloadErr?.message}`);
      }
      fileBuffer = Buffer.from(await fileData.arrayBuffer());
    } else if (!fileBuffer && source.storage_path) {
      const { data: fileData, error: downloadErr } = await supabase.storage
        .from("qhse-documents")
        .download(source.storage_path);

      if (!downloadErr && fileData) {
        fileBuffer = Buffer.from(await fileData.arrayBuffer());
      }
    } else if (source.document_id) {
      // Source issue d'un document GED existant
      const { data: docData } = await supabase
        .from("documents")
        .select("storage_path, title")
        .eq("id", source.document_id)
        .single();

      if (docData?.storage_path) {
        const { data: fileData } = await supabase.storage.from("qhse-documents").download(docData.storage_path);
        if (fileData) fileBuffer = Buffer.from(await fileData.arrayBuffer());
      }
    }

    const filename = source.original_filename || source.title || "";
    const mime = source.mime_type || "";

    // Execution du parser adapté
    if (fileBuffer) {
      if (mime.includes("pdf") || filename.endsWith(".pdf")) {
        extractedSections = await parsePdfBuffer(fileBuffer);
      } else if (mime.includes("word") || filename.endsWith(".docx")) {
        extractedSections = await parseDocxBuffer(fileBuffer);
      } else if (
        mime.includes("sheet") ||
        mime.includes("excel") ||
        mime.includes("csv") ||
        filename.endsWith(".xlsx") ||
        filename.endsWith(".xls") ||
        filename.endsWith(".csv")
      ) {
        extractedSections = await parseExcelBuffer(fileBuffer);
      } else {
        extractedSections = await parseTextBuffer(fileBuffer.toString("utf-8"));
      }
    } else if (source.description) {
      extractedSections = await parseTextBuffer(source.description);
    }

    if (extractedSections.length === 0) {
      throw new Error("Aucun contenu textuel extractible du fichier.");
    }

    // Classification Métier globale et par section
    const fullText = extractedSections.map((s) => s.content).join("\n");
    const detectedMethods = await detectQhseMethods(fullText);
    const detectedDomain = source.domain && source.domain !== "other" ? source.domain : await detectQhseDomain(fullText);

    // Suppression des anciens chunks de cette source (pour ré-ingestion propre)
    await supabase.from("knowledge_chunks").delete().eq("knowledge_source_id", sourceId);

    // Préparation de l'insertion par lot des Chunks
    const chunksToInsert = await Promise.all(
      extractedSections.map(async (sec, idx) => {
        const sectionMethods = await detectQhseMethods(sec.content);

        return {
          company_id: source.company_id || null,
          knowledge_source_id: sourceId,
          chunk_index: idx + 1,
          content: sec.content,
          title: sec.title || source.title,
          section: sec.section || null,
          page: sec.page || null,
          sheet_name: sec.sheetName || null,
          cell_range: sec.cellRange || null,
          heading: sec.heading || null,
          content_type: sec.contentType || "text",
          domain: detectedDomain,
          detected_methods: Array.from(new Set([...detectedMethods, ...sectionMethods])),
          metadata: {
            original_filename: filename,
            source_type: source.source_type,
            priority: source.priority,
            version: source.version,
          },
        };
      })
    );

    const { error: chunkInsertErr } = await supabase.from("knowledge_chunks").insert(chunksToInsert);
    if (chunkInsertErr) throw new Error(`Erreur insertion chunks: ${chunkInsertErr.message}`);

    // Mise à jour de la source
    await supabase
      .from("knowledge_sources")
      .update({
        status: "active",
        domain: detectedDomain,
        detected_methods: detectedMethods,
        ingested_at: new Date().toISOString(),
        ingestion_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", sourceId);

    // Log d'audit immuable
    await supabase.from("knowledge_audit_logs").insert({
      company_id: source.company_id || null,
      knowledge_source_id: sourceId,
      event_type: "ingest",
      details: { chunk_count: chunksToInsert.length, detected_methods: detectedMethods },
    });

    return { success: true, chunkCount: chunksToInsert.length };
  } catch (err: any) {
    const errorMsg = err?.message || "Erreur lors de l'ingestion de la source.";
    await supabase
      .from("knowledge_sources")
      .update({
        status: "error",
        ingestion_error: errorMsg,
        updated_at: new Date().toISOString(),
      })
      .eq("id", sourceId);

    await supabase.from("knowledge_audit_logs").insert({
      company_id: source.company_id || null,
      knowledge_source_id: sourceId,
      event_type: "error",
      details: { error: errorMsg },
    });

    return { success: false, error: errorMsg };
  }
}

export const ingestKnowledgeSourceFile = ingestKnowledgeSource;
