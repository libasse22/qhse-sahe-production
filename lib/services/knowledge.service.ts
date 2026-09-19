"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ingestKnowledgeSourceFile } from "@/lib/services/knowledge-ingestion.service";
import type {
  KnowledgeSource,
  KnowledgeChunk,
  KnowledgeAuditLog,
  KnowledgeSourceType,
  KnowledgeDomain,
  KnowledgePriority,
  KnowledgeStatus,
} from "@/lib/types/knowledge";

function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Ignore error when called outside Next.js request context (e.g. CLI script)
  }
}

export interface CreateKnowledgeSourceInput {
  title: string;
  description?: string;
  source_type: KnowledgeSourceType;
  domain?: KnowledgeDomain;
  priority?: KnowledgePriority;
  version?: string;
  is_global?: boolean; // If true, set company_id to null (for admin global standard/course)
  tags?: string[];
  ged_document_id?: string;
  ged_revision_id?: string;
  file_path?: string;
  file_name?: string;
  file_size?: number;
  mime_type?: string;
}

export interface KnowledgeListOptions {
  search?: string;
  status?: KnowledgeStatus;
  domain?: KnowledgeDomain;
  sourceType?: KnowledgeSourceType;
  priority?: KnowledgePriority;
}

/**
 * Liste des sources de connaissances accessibles au tenant courant (et sources globales public/système)
 */
export async function getKnowledgeSources(options?: KnowledgeListOptions): Promise<KnowledgeSource[]> {
  const supabase = await createClient();

  let query = supabase
    .from("knowledge_sources")
    .select("*")
    .order("created_at", { ascending: false });

  if (options?.search) {
    query = query.or(`title.ilike.%${options.search}%,description.ilike.%${options.search}%`);
  }

  if (options?.status) {
    query = query.eq("status", options.status);
  }

  if (options?.domain) {
    query = query.eq("domain", options.domain);
  }

  if (options?.sourceType) {
    query = query.eq("source_type", options.sourceType);
  }

  if (options?.priority) {
    query = query.eq("priority", options.priority);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Erreur lors de la récupération des sources de connaissances:", error);
    return [];
  }

  return (data as KnowledgeSource[]) || [];
}

/**
 * Obtenir les détails complets d'une source, avec ses chunks et ses logs d'audit
 */
export async function getKnowledgeSourceDetails(id: string): Promise<{
  source: KnowledgeSource | null;
  chunks: KnowledgeChunk[];
  auditLogs: KnowledgeAuditLog[];
}> {
  const supabase = await createClient();

  const { data: source, error: sourceErr } = await supabase
    .from("knowledge_sources")
    .select("*")
    .eq("id", id)
    .single();

  if (sourceErr || !source) {
    return { source: null, chunks: [], auditLogs: [] };
  }

  const { data: chunks } = await supabase
    .from("knowledge_chunks")
    .select("*")
    .eq("knowledge_source_id", id)
    .order("chunk_index", { ascending: true });

  const { data: auditLogs } = await supabase
    .from("knowledge_audit_logs")
    .select("*")
    .eq("knowledge_source_id", id)
    .order("created_at", { ascending: false });

  return {
    source: source as KnowledgeSource,
    chunks: (chunks as KnowledgeChunk[]) || [],
    auditLogs: (auditLogs as KnowledgeAuditLog[]) || [],
  };
}

/**
 * Créer une source de connaissances dans la base
 */
export async function createKnowledgeSource(input: CreateKnowledgeSourceInput): Promise<{
  success: boolean;
  sourceId?: string;
  error?: string;
}> {
  const supabase = await createClient();

  // Obtenir company_id si ce n'est pas une source globale
  let companyId: string | null = null;
  if (!input.is_global) {
    const { data: profile } = await supabase.auth.getUser();
    if (profile?.user) {
      const { data: userProfile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", profile.user.id)
        .single();
      companyId = userProfile?.company_id || null;
    }
  }

  const dbSourceTypeMap: Record<string, string> = {
    cours: "course",
    support_formation: "course",
    outil_excel: "tool_excel",
    methode_qhse: "methodology",
    norme_referentiel: "standard_reference",
    reglementation: "regulation",
    ged_doc: "internal_document",
    autre: "other",
  };
  const dbSourceType = dbSourceTypeMap[input.source_type] || input.source_type || "other";

  let dbPriority = 2;
  if (input.priority === "critical" || input.priority === 1) dbPriority = 1;
  else if (input.priority === "high" || input.priority === 2) dbPriority = 2;
  else if (input.priority === "low" || input.priority === 3) dbPriority = 3;

  const { data, error } = await supabase
    .from("knowledge_sources")
    .insert({
      company_id: companyId,
      title: input.title,
      description: input.description || null,
      source_type: dbSourceType,
      domain: input.domain || "other",
      priority: dbPriority,
      version: input.version || "v1",
      status: "active",
      tags: input.tags || [],
      document_id: input.ged_document_id || null,
      revision_id: input.ged_revision_id || null,
      storage_path: input.file_path || null,
      original_filename: input.file_name || null,
      file_size: input.file_size || null,
      mime_type: input.mime_type || null,
    })
    .select()
    .single();

  if (error) {
    console.error("Erreur création source connaissances:", error);
    return { success: false, error: error.message };
  }

  // Log audit
function safeRevalidatePath(pathStr: string) {
  try {
    revalidatePath(pathStr);
  } catch {
    // Ignore si appelé hors requête HTTP (ex: script/CLI)
  }
}

  await supabase.from("knowledge_audit_logs").insert({
    company_id: companyId,
    knowledge_source_id: data.id,
    event_type: "create",
    details: { title: input.title, source_type: input.source_type },
  });

  safeRevalidatePath("/parametres/knowledge");
  return { success: true, sourceId: data.id };
}

/**
 * Lancer l'ingestion d'un fichier uploadé ou déjà enregistré en Storage
 */
export async function processKnowledgeSourceIngestion(
  sourceId: string,
  fileBuffer?: Buffer
): Promise<{ success: boolean; chunkCount?: number; error?: string }> {
  const result = await ingestKnowledgeSourceFile(sourceId, fileBuffer);
  safeRevalidatePath("/parametres/knowledge");
  return result;
}

/**
 * Ré-ingérer une source existante (mise à jour version / recalcul des chunks)
 */
export async function reingestKnowledgeSource(sourceId: string): Promise<{
  success: boolean;
  chunkCount?: number;
  error?: string;
}> {
  const result = await ingestKnowledgeSourceFile(sourceId);

  if (result.success) {
    const supabase = await createClient();
    const { data: source } = await supabase
      .from("knowledge_sources")
      .select("company_id")
      .eq("id", sourceId)
      .single();

    await supabase.from("knowledge_audit_logs").insert({
      company_id: source?.company_id || null,
      knowledge_source_id: sourceId,
      event_type: "reingest",
      details: { chunk_count: result.chunkCount },
    });
  }

  safeRevalidatePath("/parametres/knowledge");
  return result;
}

/**
 * Intégrer directement un Document GED existant comme Source de Connaissance
 */
export async function ingestGedDocumentAsKnowledgeSource(
  gedDocumentId: string,
  revisionId?: string
): Promise<{ success: boolean; sourceId?: string; error?: string }> {
  const supabase = await createClient();

  // 1. Récupérer le document GED
  const { data: doc, error: docErr } = await supabase
    .from("documents")
    .select("*, revisions:document_revisions(*)")
    .eq("id", gedDocumentId)
    .single();

  if (docErr || !doc) {
    return { success: false, error: "Document GED introuvable" };
  }

  // Trouver la bonne révision ou la dernière révision valide
  let targetRevision = doc.revisions?.find((r: any) => r.id === revisionId);
  if (!targetRevision && doc.revisions?.length > 0) {
    // Trier par num_revision décroissant
    targetRevision = doc.revisions.sort((a: any, b: any) => b.num_revision - a.num_revision)[0];
  }

  const filePath = targetRevision?.file_path || doc.file_path;
  const fileName = targetRevision?.file_name || doc.file_name || doc.title;
  const fileSize = targetRevision?.file_size || doc.file_size || 0;
  const mimeType = targetRevision?.mime_type || doc.mime_type || "application/octet-stream";

  if (!filePath) {
    return { success: false, error: "Fichier associé au document GED introuvable" };
  }

  // Mapping domaine GED -> domaine Knowledge
  let domain: KnowledgeDomain = "other";
  if (doc.domain === "qualite") domain = "quality";
  else if (doc.domain === "securite") domain = "health_safety";
  else if (doc.domain === "environnement") domain = "environment";
  else if (doc.domain === "combines") domain = "management";

  // 2. Créer la source de connaissances
  const createRes = await createKnowledgeSource({
    title: doc.title || fileName,
    description: doc.description || `Document GED codifié ${doc.code || ""}`,
    source_type: "ged_doc",
    domain,
    priority: "high",
    version: targetRevision ? `v${targetRevision.num_revision}` : "v1.0",
    is_global: false,
    tags: [doc.document_type || "ged", doc.code || ""].filter(Boolean),
    ged_document_id: gedDocumentId,
    ged_revision_id: targetRevision?.id || null,
    file_path: filePath,
    file_name: fileName,
    file_size: fileSize,
    mime_type: mimeType,
  });

  if (!createRes.success || !createRes.sourceId) {
    return createRes;
  }

  // 3. Télécharger le buffer depuis Storage pour ingérer
  const { data: fileData, error: downloadErr } = await supabase.storage
    .from("qhse-documents")
    .download(filePath);

  let fileBuffer: Buffer | undefined;
  if (!downloadErr && fileData) {
    const arrayBuffer = await fileData.arrayBuffer();
    fileBuffer = Buffer.from(arrayBuffer);
  }

  // 4. Lancer l'ingestion
  const ingestRes = await ingestKnowledgeSourceFile(createRes.sourceId, fileBuffer);

  return {
    success: ingestRes.success,
    sourceId: createRes.sourceId,
    error: ingestRes.error,
  };
}

/**
 * Activer / désactiver une source de connaissances
 */
export async function toggleKnowledgeSourceStatus(
  sourceId: string,
  newStatus: KnowledgeStatus
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("knowledge_sources")
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq("id", sourceId);

  if (error) {
    return { success: false, error: error.message };
  }

  safeRevalidatePath("/parametres/knowledge");
  return { success: true };
}

/**
 * Supprimer une source de connaissances et ses chunks
 */
export async function deleteKnowledgeSource(sourceId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("knowledge_sources")
    .delete()
    .eq("id", sourceId);

  if (error) {
    return { success: false, error: error.message };
  }

  safeRevalidatePath("/parametres/knowledge");
  return { success: true };
}

/**
 * Statistiques de la Base de Connaissances QHSE (KPIs)
 */
export async function getKnowledgeStats(): Promise<{
  totalSources: number;
  totalChunks: number;
  sourcesByDomain: Record<string, number>;
  sourcesByType: Record<string, number>;
  activeCount: number;
  pendingCount: number;
  errorCount: number;
}> {
  const supabase = await createClient();

  const { data: sources } = await supabase.from("knowledge_sources").select("id, status, domain, source_type");
  const { count: totalChunks } = await supabase.from("knowledge_chunks").select("*", { count: "exact", head: true });

  const stats = {
    totalSources: sources?.length || 0,
    totalChunks: totalChunks || 0,
    sourcesByDomain: {} as Record<string, number>,
    sourcesByType: {} as Record<string, number>,
    activeCount: 0,
    pendingCount: 0,
    errorCount: 0,
  };

  sources?.forEach((src) => {
    if (src.status === "active") stats.activeCount++;
    else if (src.status === "pending") stats.pendingCount++;
    else if (src.status === "error") stats.errorCount++;

    const dom = src.domain || "other";
    stats.sourcesByDomain[dom] = (stats.sourcesByDomain[dom] || 0) + 1;

    const st = src.source_type || "autre";
    stats.sourcesByType[st] = (stats.sourcesByType[st] || 0) + 1;
  });

  return stats;
}

// ----------------------------------------------------------------------------
// RETRIEVAL & PROVENANCE KNOWLEDGE ENGINE (PHASE R2)
// ----------------------------------------------------------------------------

export interface KnowledgeSearchResult {
  knowledge_source_id: string;
  knowledge_chunk_id: string;
  title: string;
  source_type: KnowledgeSourceType;
  domain: KnowledgeDomain;
  section?: string | null;
  heading?: string | null;
  page?: number | null;
  sheet_name?: string | null;
  cell_range?: string | null;
  content: string;
  version: string;
  standard_reference?: string | null;
  ged_document_id?: string | null;
  ged_revision_id?: string | null;
  detected_methods?: string[];
  priority: KnowledgePriority;
  score: number;
}

export interface SearchKnowledgeChunksOptions {
  query: string;
  companyId?: string | null;
  domain?: KnowledgeDomain;
  sourceType?: KnowledgeSourceType;
  method?: string;
  limit?: number;
}

export interface KnowledgeCitation {
  knowledgeSourceId: string;
  chunkId: string;
  title: string;
  sourceType: KnowledgeSourceType;
  domain: KnowledgeDomain;
  section?: string | null;
  heading?: string | null;
  page?: number | null;
  sheetName?: string | null;
  cellRange?: string | null;
  version?: string;
  gedDocumentId?: string | null;
  gedRevisionId?: string | null;
  href?: string;
  badgeText: string;
  formattedCitation: string;
}

/**
 * Recherche textuelle et déterministe dans les Chunks de la Base de Connaissances.
 * Multi-tenant et RLS sécurisé (company_id IS NULL OR company_id = tenant).
 * Ranking: 1. Titre/Heading, 2. Méthode/Domaine, 3. Section/Feuille, 4. Contenu.
 */
const FRENCH_STOP_WORDS = new Set([
  "le", "la", "les", "un", "une", "des", "du", "de", "d", "l",
  "et", "ou", "en", "au", "aux", "est", "sont", "a", "ont", "ce",
  "ces", "cette", "cet", "mon", "ma", "mes", "ton", "ta", "tes",
  "son", "sa", "ses", "notre", "nos", "votre", "vos", "leur", "leurs",
  "que", "qui", "quoi", "dont", "où", "qu", "dans", "par", "pour", "sur",
  "avec", "sans", "sous", "vers", "chez", "ne", "pas", "plus", "moins",
  "mais", "donc", "car", "ni", "si", "bien", "très", "tout", "tous", "toute",
  "toutes", "quel", "quelle", "quels", "quelles", "comment", "pourquoi",
  "quand", "est-ce", "faire", "fait", "faites", "être", "avoir", "aussi",
  "comme", "selon", "entre", "autre", "autres", "également"
]);

export async function searchKnowledgeChunks(
  queryOrOptions: string | SearchKnowledgeChunksOptions,
  extraOptions?: Partial<SearchKnowledgeChunksOptions>
): Promise<KnowledgeSearchResult[]> {
  const supabase = await createClient();
  const options: SearchKnowledgeChunksOptions =
    typeof queryOrOptions === "string"
      ? { query: queryOrOptions, ...extraOptions }
      : queryOrOptions;
  const limit = options.limit || 8;
  const rawQuery = (options.query || "").trim();

  // Mots-clés pertinents (>= 2 car, sans stop words)
  const keywords = rawQuery
    .toLowerCase()
    .replace(/[^\w\sàâäéèêëîïôöùûüç]/gi, " ")
    .split(/\s+/)
    .filter((k) => k.length >= 2 && !FRENCH_STOP_WORDS.has(k));

  // Requête vers les Chunks des sources actives
  let query = supabase
    .from("knowledge_chunks")
    .select(`
      id,
      knowledge_source_id,
      chunk_index,
      content,
      title,
      section,
      page,
      sheet_name,
      cell_range,
      heading,
      content_type,
      domain,
      detected_methods,
      created_at,
      source:knowledge_sources(
        id,
        company_id,
        title,
        source_type,
        domain,
        status,
        priority,
        version,
        document_id,
        revision_id,
        standard_reference
      )
    `);

  const { data: chunks, error } = await query;

  if (error || !chunks || chunks.length === 0) {
    if (error) console.error("Erreur searchKnowledgeChunks:", error);
    return [];
  }

  // Scoring et classement
  const scoredResults: KnowledgeSearchResult[] = [];

  for (const item of chunks) {
    const src = item.source as any;
    if (!src || src.status !== "active") continue;

    if (options.sourceType && src.source_type !== options.sourceType) {
      continue;
    }

    const effectiveDomain = item.domain || src.domain;
    if (options.domain && options.domain !== "other" && effectiveDomain !== options.domain) {
      continue;
    }

    let score = 0;
    let matchCount = 0;
    const chunkTitle = (item.title || src.title || "").toLowerCase();
    const sectionStr = (item.section || "").toLowerCase();
    const headingStr = (item.heading || "").toLowerCase();
    const sheetStr = (item.sheet_name || "").toLowerCase();
    const contentStr = (item.content || "").toLowerCase();
    const methods = (item.detected_methods || []) as string[];

    // 1. Filtrage / Boost si méthode spécifique recherchée (e.g. AMDEC, PESTEL)
    if (options.method) {
      const targetMethod = options.method.toLowerCase();
      if (methods.some((m) => m.toLowerCase().includes(targetMethod))) {
        score += 60;
        matchCount++;
      }
    }

    // 2. Score de mots-clés
    for (const kw of keywords) {
      let kwMatch = false;
      if (chunkTitle.includes(kw)) { score += 25; kwMatch = true; }
      if (headingStr.includes(kw)) { score += 20; kwMatch = true; }
      if (sectionStr.includes(kw)) { score += 15; kwMatch = true; }
      if (sheetStr.includes(kw)) { score += 15; kwMatch = true; }
      if (contentStr.includes(kw)) { score += 8; kwMatch = true; }
      if (methods.some((m) => m.toLowerCase().includes(kw))) { score += 30; kwMatch = true; }
      if (kwMatch) matchCount++;
    }

    // 3. Bonus priorités (appliqué uniquement en cas de correspondance)
    if (matchCount > 0) {
      if (src.priority === "critical" || src.priority === 1) score += 15;
      if (src.priority === "high" || src.priority === 2) score += 10;
    }

    // Seuls les résultats avec score significatif (avec au moins un mot-clé/méthode assorti) sont retenus
    if (score > 0) {
      scoredResults.push({
        knowledge_source_id: src.id,
        knowledge_chunk_id: item.id,
        title: item.title || src.title,
        source_type: src.source_type,
        domain: (item.domain || src.domain || "other") as KnowledgeDomain,
        section: item.section || null,
        heading: item.heading || null,
        page: item.page || null,
        sheet_name: item.sheet_name || null,
        cell_range: item.cell_range || null,
        content: item.content,
        version: src.version || "1.0",
        standard_reference: src.standard_reference || null,
        ged_document_id: src.document_id || null,
        ged_revision_id: src.revision_id || null,
        detected_methods: methods,
        priority: src.priority,
        score,
      });
    }
  }

  // Tri décroissant par score
  scoredResults.sort((a, b) => b.score - a.score);

  // Dédoublonnage (max 2 chunks par source)
  const sourceCountMap: Record<string, number> = {};
  const deduplicated: KnowledgeSearchResult[] = [];

  for (const res of scoredResults) {
    const count = sourceCountMap[res.knowledge_source_id] || 0;
    if (count < 2) {
      sourceCountMap[res.knowledge_source_id] = count + 1;
      deduplicated.push(res);
    }
    if (deduplicated.length >= limit) break;
  }

  return deduplicated;
}

/**
 * Construit la citation exacte et la provenance sans hallucination.
 */
export async function buildKnowledgeCitation(item: KnowledgeSearchResult): Promise<KnowledgeCitation> {
  let citationStr = "";
  let badgeText = "";
  let href = "/parametres/knowledge";

  if (item.ged_document_id) {
    href = `/documents/${item.ged_document_id}`;
  }

  const st = item.source_type;

  if (st === "outil_excel" || st === "tool_excel") {
    citationStr = `Outil Excel : ${item.title}`;
    if (item.sheet_name) citationStr += ` — Feuille : ${item.sheet_name}`;
    if (item.cell_range) citationStr += ` (Plage : ${item.cell_range})`;
    badgeText = item.sheet_name ? `Excel · ${item.sheet_name}` : "Excel";
  } else if (st === "cours" || st === "course" || st === "support_formation") {
    citationStr = `Cours QHSE : ${item.title}`;
    if (item.heading) citationStr += ` — ${item.heading}`;
    else if (item.section) citationStr += ` — ${item.section}`;
    if (item.page) citationStr += ` (Page ${item.page})`;
    badgeText = item.page ? `Cours · Page ${item.page}` : "Cours QHSE";
  } else if (st === "ged_doc" || st === "internal_document") {
    citationStr = `Document GED : ${item.title}`;
    if (item.version) citationStr += ` — ${item.version}`;
    if (item.section) citationStr += ` (${item.section})`;
    badgeText = item.version ? `GED · ${item.version}` : "GED Interne";
  } else if (st === "norme_referentiel" || st === "standard_reference" || st === "reglementation" || st === "regulation") {
    citationStr = `Norme / Référentiel : ${item.title}`;
    if (item.standard_reference) citationStr += ` [Réf: ${item.standard_reference}]`;
    if (item.section) citationStr += ` — ${item.section}`;
    badgeText = item.standard_reference || "Norme ISO";
  } else {
    citationStr = `Source Connaissances : ${item.title}`;
    if (item.section) citationStr += ` — ${item.section}`;
    badgeText = "Connaissances";
  }

  return {
    knowledgeSourceId: item.knowledge_source_id,
    chunkId: item.knowledge_chunk_id,
    title: item.title,
    sourceType: item.source_type,
    domain: item.domain,
    section: item.section,
    heading: item.heading,
    page: item.page,
    sheetName: item.sheet_name,
    cellRange: item.cell_range,
    version: item.version,
    gedDocumentId: item.ged_document_id,
    gedRevisionId: item.ged_revision_id,
    href,
    badgeText,
    formattedCitation: citationStr,
  };
}

