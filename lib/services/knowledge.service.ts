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

  const { data, error } = await supabase
    .from("knowledge_sources")
    .insert({
      company_id: companyId,
      title: input.title,
      description: input.description || null,
      source_type: input.source_type,
      domain: input.domain || "other",
      priority: input.priority || "medium",
      version: input.version || "1.0",
      status: "pending",
      tags: input.tags || [],
      ged_document_id: input.ged_document_id || null,
      ged_revision_id: input.ged_revision_id || null,
      file_path: input.file_path || null,
      file_name: input.file_name || null,
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
  await supabase.from("knowledge_audit_logs").insert({
    company_id: companyId,
    knowledge_source_id: data.id,
    event_type: "create",
    details: { title: input.title, source_type: input.source_type },
  });

  revalidatePath("/parametres/knowledge");
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
  revalidatePath("/parametres/knowledge");
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

  revalidatePath("/parametres/knowledge");
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

  revalidatePath("/parametres/knowledge");
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

  revalidatePath("/parametres/knowledge");
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
