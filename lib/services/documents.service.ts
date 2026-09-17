"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { documentMetaSchema } from "@/lib/validation/document.schema";
import type { ActionResult } from "@/lib/services/auth.service";
import type {
  QhseDocument,
  DocumentFolder,
  DocumentRevision,
  DocumentLink,
  DocumentHistoryEvent,
  DocumentSignature,
  DocumentType,
  DomaineQhse,
  DocumentStatus,
  DocumentFilterOptions,
  DocumentDetails,
  DocumentOrigin,
  ExternalVerificationStatus,
  RejectionCategory,
  CalculatedDocumentState,
  DocumentRetentionPolicy,
} from "@/lib/types/document";

const BUCKET = "qhse-documents";
const SIGNED_URL_TTL_SECONDS = 60 * 60;
const DOCUMENT_SELECT = "*, author:profiles!documents_uploaded_by_fkey(full_name)";

/** Calcul du statut temporel d'un document (échéance de revue / expiration) */
export async function calculateDocumentState(
  reviewDate?: string | null,
  expiryDate?: string | null
): Promise<CalculatedDocumentState> {
  const todayStr = new Date().toISOString().split("T")[0];
  const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  if (expiryDate) {
    if (expiryDate < todayStr) return "expire";
    if (expiryDate <= in30Days) return "echeance_proche";
  }

  if (reviewDate) {
    if (reviewDate < todayStr) return "revue_depassee";
    if (reviewDate <= in30Days) return "revue_proche";
  }

  return "normal";
}

// ----------------------------------------------------------------------------
// CODIFICATION AUTOMATIQUE TRANSACTIONNELLE
// ----------------------------------------------------------------------------

export async function generateDocumentCode(
  documentType: DocumentType = "autre",
  domain: DomaineQhse = "securite",
): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase.from("profiles").select("company_id").eq("id", user.id).single();
  if (!profile?.company_id) return null;

  const domainStr = domain.toUpperCase();
  const { data: codeData, error } = await supabase.rpc("generate_document_code_reference", {
    p_company_id: profile.company_id,
    p_document_type: documentType,
    p_domain: domainStr,
  });

  if (error || !codeData) {
    console.error("Erreur génération code documentaire:", error);
    return null;
  }

  return codeData as string;
}

// ----------------------------------------------------------------------------
// CRÉATION ET LISTING DES DOCUMENTS (COMPATIBILITÉ ET GED V2)
// ----------------------------------------------------------------------------

export async function listDocuments(filterInput?: DocumentFilterOptions | string): Promise<QhseDocument[]> {
  const supabase = await createClient();
  let query = supabase.from("documents").select(DOCUMENT_SELECT).order("created_at", { ascending: false });

  const options: DocumentFilterOptions = typeof filterInput === "string" ? { folderId: filterInput } : filterInput || {};

  if (options.folderId) {
    query = query.eq("folder_id", options.folderId);
  }
  if (options.status && options.status !== "all") {
    query = query.eq("status", options.status);
  }
  if (options.documentType && options.documentType !== "all") {
    query = query.eq("document_type", options.documentType);
  }
  if (options.domaineQhse && options.domaineQhse !== "all") {
    query = query.eq("domaine_qhse", options.domaineQhse);
  }
  if (options.originType && options.originType !== "all") {
    query = query.eq("origin_type", options.originType);
  }
  if (options.searchQuery && options.searchQuery.trim() !== "") {
    const q = `%${options.searchQuery.trim()}%`;
    query = query.or(`title.ilike.${q},code_reference.ilike.${q},original_filename.ilike.${q},external_reference.ilike.${q},external_source.ilike.${q}`);
  }

  const { data, error } = await query;

  if (error || !data) return [];

  return Promise.all(
    (
      data as unknown as {
        id: string;
        company_id?: string | null;
        code_reference?: string | null;
        folder_id?: string | null;
        title: string;
        category: string;
        document_type?: DocumentType;
        domaine_qhse?: DomaineQhse;
        storage_path: string;
        version: number;
        version_major?: number;
        version_minor?: number;
        revision_code?: string;
        status?: DocumentStatus;
        origin_type?: DocumentOrigin;
        external_source?: string | null;
        external_reference?: string | null;
        external_document_date?: string | null;
        external_received_date?: string | null;
        retention_duration_years?: number | null;
        retention_unit?: 'ans' | 'mois' | 'indefini';
        original_filename?: string | null;
        file_type?: string | null;
        file_size?: number | null;
        is_generated?: boolean;
        source_module?: string | null;
        source_entity_id?: string | null;
        effective_date?: string | null;
        review_date?: string | null;
        expiry_date?: string | null;
        tags?: string[];
        created_at: string;
        updated_at?: string;
        author: { full_name: string } | null;
      }[]
    ).map(async (row) => {
      let signedUrl: string | null = null;
      if (row.storage_path) {
        const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrl(row.storage_path, SIGNED_URL_TTL_SECONDS);
        signedUrl = signed?.signedUrl ?? null;
      }

      return {
        id: row.id,
        companyId: row.company_id ?? null,
        codeReference: row.code_reference ?? null,
        folderId: row.folder_id ?? null,
        title: row.title,
        category: row.category || "Général",
        documentType: row.document_type || "autre",
        domaineQhse: row.domaine_qhse || "securite",
        storagePath: row.storage_path || "",
        version: row.version || 1,
        versionMajor: row.version_major ?? 1,
        versionMinor: row.version_minor ?? 0,
        revisionCode: row.revision_code || "REV00",
        status: row.status || "en_vigueur",
        originType: row.origin_type || "interne",
        externalSource: row.external_source ?? null,
        externalReference: row.external_reference ?? null,
        externalDocumentDate: row.external_document_date ?? null,
        externalReceivedDate: row.external_received_date ?? null,
        retentionDurationYears: row.retention_duration_years ?? undefined,
        retentionUnit: row.retention_unit || "ans",
        originalFilename: row.original_filename ?? null,
        fileType: row.file_type ?? null,
        fileSize: row.file_size ?? null,
        isGenerated: row.is_generated ?? false,
        sourceModule: row.source_module ?? null,
        sourceEntityId: row.source_entity_id ?? null,
        effectiveDate: row.effective_date ?? null,
        reviewDate: row.review_date ?? null,
        expiryDate: row.expiry_date ?? null,
        tags: row.tags ?? [],
        uploadedByName: row.author?.full_name || "—",
        createdAt: row.created_at,
        updatedAt: row.updated_at ?? row.created_at,
        url: signedUrl,
      };
    }),
  );
}

/** Prépare une URL de dépôt signée pour l'upload direct depuis le navigateur. */
export async function createDocumentUploadTarget(
  fileName: string,
): Promise<{ path: string; token: string } | { error: string }> {
  const supabase = await createClient();
  const safeName = fileName.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  const path = `${Date.now()}-${safeName}`;

  const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(path);
  if (error || !data) return { error: "Impossible de préparer l'envoi du document." };

  return { path: data.path, token: data.token };
}

export async function createDocument(params: {
  title: string;
  category?: string;
  documentType?: DocumentType;
  domaineQhse?: DomaineQhse;
  storagePath: string;
  folderId?: string | null;
  originalFilename?: string;
  fileType?: string;
  fileSize?: number;
  tags?: string[];
  effectiveDate?: string | null;
  reviewDate?: string | null;
  expiryDate?: string | null;
  originType?: DocumentOrigin;
  externalSource?: string | null;
  externalReference?: string | null;
  externalDocumentDate?: string | null;
  externalReceivedDate?: string | null;
  retentionDurationYears?: number | null;
  retentionUnit?: 'ans' | 'mois' | 'indefini';
}): Promise<ActionResult & { documentId?: string; codeReference?: string }> {
  const parsed = documentMetaSchema.safeParse({ title: params.title, category: params.category || "Général" });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Titre invalide" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Session expirée, reconnecte-toi." };

  const { data: profile } = await supabase.from("profiles").select("company_id, full_name").eq("id", user.id).single();

  const docType = params.documentType || "autre";
  const domain = params.domaineQhse || "securite";
  const originType = params.originType || "interne";

  // Code reference transactionnel
  let codeRef: string | null = null;
  if (profile?.company_id) {
    codeRef = await generateDocumentCode(docType, domain);
  }

  // 1. Création identité logique document
  const { data: docData, error: docError } = await supabase
    .from("documents")
    .insert({
      title: parsed.data.title,
      category: parsed.data.category || "Général",
      storage_path: params.storagePath,
      uploaded_by: user.id,
      code_reference: codeRef,
      folder_id: params.folderId || null,
      document_type: docType,
      domaine_qhse: domain,
      version_major: 1,
      version_minor: 0,
      revision_code: "REV00",
      status: "en_vigueur",
      origin_type: originType,
      external_source: params.externalSource || null,
      external_reference: params.externalReference || null,
      external_document_date: params.externalDocumentDate || null,
      external_received_date: params.externalReceivedDate || null,
      retention_duration_years: params.retentionDurationYears ?? null,
      retention_unit: params.retentionUnit || "ans",
      original_filename: params.originalFilename || null,
      file_type: params.fileType || null,
      file_size: params.fileSize || null,
      tags: params.tags || [],
      effective_date: params.effectiveDate || null,
      review_date: params.reviewDate || null,
      expiry_date: params.expiryDate || null,
    })
    .select("id")
    .single();

  if (docError || !docData) return { error: "Impossible de créer l'entrée documentaire." };

  const documentId = docData.id;
  const verificationStatus: ExternalVerificationStatus = originType === "externe" ? "a_verifier" : "verifie";

  // 2. Création première révision REV00
  await supabase.from("document_revisions").insert({
    document_id: documentId,
    revision_code: "REV00",
    version_major: 1,
    version_minor: 0,
    storage_path: params.storagePath,
    change_summary: "Création initiale (REV00)",
    status: "en_vigueur",
    verification_status: verificationStatus,
    created_by: user.id,
  });

  // 3. Log historique immuable
  await supabase.from("document_history").insert({
    document_id: documentId,
    event_type: "created",
    actor_id: user.id,
    actor_name: profile?.full_name || "Utilisateur",
    details: {
      title: params.title,
      code_reference: codeRef,
      revision_code: "REV00",
      storage_path: params.storagePath,
    },
  });

  revalidatePath("/documents");
  return { error: null, documentId, codeReference: codeRef || undefined };
}

export async function confirmDocument(
  storagePath: string,
  title: string,
  category: string,
  options?: {
    folderId?: string;
    documentType?: DocumentType;
    domaineQhse?: DomaineQhse;
    originalFilename?: string;
    fileType?: string;
    fileSize?: number;
  },
): Promise<ActionResult & { documentId?: string }> {
  return createDocument({
    title,
    category,
    storagePath,
    folderId: options?.folderId,
    documentType: options?.documentType,
    domaineQhse: options?.domaineQhse,
    originalFilename: options?.originalFilename,
    fileType: options?.fileType,
    fileSize: options?.fileSize,
  });
}

export async function deleteDocument(id: string, storagePath: string): Promise<ActionResult> {
  const supabase = await createClient();
  if (storagePath) {
    await supabase.storage.from(BUCKET).remove([storagePath]);
  }
  const { error } = await supabase.from("documents").delete().eq("id", id);
  if (error) return { error: "Impossible de supprimer ce document." };
  revalidatePath("/documents");
  return { error: null };
}

// ----------------------------------------------------------------------------
// DÉTAILS DOCUMENTAIRES COMPLETS (GED V2 FICHE DÉTAILLÉE)
// ----------------------------------------------------------------------------

export async function getDocumentDetails(documentId: string): Promise<DocumentDetails | null> {
  const supabase = await createClient();
  const { data: docData, error: docError } = await supabase
    .from("documents")
    .select(DOCUMENT_SELECT)
    .eq("id", documentId)
    .single();

  if (docError || !docData) return null;

  const rawDoc = docData as unknown as {
    id: string;
    company_id?: string | null;
    code_reference?: string | null;
    folder_id?: string | null;
    title: string;
    category: string;
    document_type?: DocumentType;
    domaine_qhse?: DomaineQhse;
    storage_path: string;
    version: number;
    version_major?: number;
    version_minor?: number;
    revision_code?: string;
    status?: DocumentStatus;
    origin_type?: DocumentOrigin;
    external_source?: string | null;
    external_reference?: string | null;
    external_document_date?: string | null;
    external_received_date?: string | null;
    retention_duration_years?: number | null;
    retention_unit?: 'ans' | 'mois' | 'indefini';
    original_filename?: string | null;
    file_type?: string | null;
    file_size?: number | null;
    is_generated?: boolean;
    source_module?: string | null;
    source_entity_id?: string | null;
    effective_date?: string | null;
    review_date?: string | null;
    expiry_date?: string | null;
    tags?: string[];
    created_at: string;
    updated_at?: string;
    author: { full_name: string } | null;
  };

  let signedUrl: string | null = null;
  if (rawDoc.storage_path) {
    const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrl(rawDoc.storage_path, SIGNED_URL_TTL_SECONDS);
    signedUrl = signed?.signedUrl ?? null;
  }

  const document: QhseDocument = {
    id: rawDoc.id,
    companyId: rawDoc.company_id ?? null,
    codeReference: rawDoc.code_reference ?? null,
    folderId: rawDoc.folder_id ?? null,
    title: rawDoc.title,
    category: rawDoc.category || "Général",
    documentType: rawDoc.document_type || "autre",
    domaineQhse: rawDoc.domaine_qhse || "securite",
    storagePath: rawDoc.storage_path || "",
    version: rawDoc.version || 1,
    versionMajor: rawDoc.version_major ?? 1,
    versionMinor: rawDoc.version_minor ?? 0,
    revisionCode: rawDoc.revision_code || "REV00",
    status: rawDoc.status || "en_vigueur",
    originType: rawDoc.origin_type || "interne",
    externalSource: rawDoc.external_source ?? null,
    externalReference: rawDoc.external_reference ?? null,
    externalDocumentDate: rawDoc.external_document_date ?? null,
    externalReceivedDate: rawDoc.external_received_date ?? null,
    retentionDurationYears: rawDoc.retention_duration_years ?? undefined,
    retentionUnit: rawDoc.retention_unit || "ans",
    originalFilename: rawDoc.original_filename ?? null,
    fileType: rawDoc.file_type ?? null,
    fileSize: rawDoc.file_size ?? null,
    isGenerated: rawDoc.is_generated ?? false,
    sourceModule: rawDoc.source_module ?? null,
    sourceEntityId: rawDoc.source_entity_id ?? null,
    effectiveDate: rawDoc.effective_date ?? null,
    reviewDate: rawDoc.review_date ?? null,
    expiryDate: rawDoc.expiry_date ?? null,
    tags: rawDoc.tags ?? [],
    uploadedByName: rawDoc.author?.full_name || "—",
    createdAt: rawDoc.created_at,
    updatedAt: rawDoc.updated_at ?? rawDoc.created_at,
    url: signedUrl,
  };

  const [folders, revisions, links, history, signatures, retentionRes] = await Promise.all([
    rawDoc.folder_id
      ? supabase.from("document_folders").select("*").eq("id", rawDoc.folder_id).single().then((res) => res.data)
      : Promise.resolve(null),
    listDocumentRevisions(documentId),
    listDocumentLinks(documentId),
    listDocumentHistory(documentId),
    listDocumentSignatures(documentId),
    supabase
      .from("document_retention_policies")
      .select("*")
      .or(`document_type.eq.${document.documentType},document_type.eq.default`)
      .order("document_type", { ascending: false })
      .limit(1)
      .then((res) => res.data),
  ]);

  let folder: DocumentFolder | null = null;
  if (folders) {
    folder = {
      id: folders.id,
      companyId: folders.company_id,
      parentId: folders.parent_id,
      name: folders.name,
      codePrefix: folders.code_prefix,
      description: folders.description,
      icon: folders.icon,
      sortOrder: folders.sort_order,
      createdBy: folders.created_by,
      createdAt: folders.created_at,
      updatedAt: folders.updated_at,
    };
  }

  let retentionPolicy: DocumentRetentionPolicy | null = null;
  if (retentionRes && retentionRes.length > 0) {
    const pol = retentionRes[0];
    retentionPolicy = {
      id: pol.id,
      companyId: pol.company_id,
      documentType: pol.document_type as DocumentType | "default",
      retentionYears: pol.retention_years,
      retentionUnit: pol.retention_unit as "ans" | "mois" | "indefini",
      description: pol.description ?? undefined,
      createdAt: pol.created_at,
      updatedAt: pol.updated_at,
    };
  }

  const calculatedState = await calculateDocumentState(document.reviewDate, document.expiryDate);
  const activeRev = revisions.find((r) => r.status === "en_vigueur") || revisions[0];
  const activeRevisionVerification = activeRev?.verificationStatus || (document.originType === "externe" ? "a_verifier" : "verifie");

  document.calculatedState = calculatedState;
  document.activeRevisionVerification = activeRevisionVerification;

  return {
    document,
    folder,
    revisions,
    links,
    history,
    signatures,
    retentionPolicy,
  };
}

// ----------------------------------------------------------------------------
// GESTION DES RÉVISIONS DOCUMENTAIRES (REV00 -> REV01 -> REV02)
// ----------------------------------------------------------------------------

export async function createDocumentRevision(params: {
  documentId: string;
  storagePath: string;
  changeSummary: string;
  isMajorVersion?: boolean;
}): Promise<ActionResult & { revisionId?: string; revisionCode?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Session expirée, reconnecte-toi." };

  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();

  // 1. Récupération du document parent pour connaître son origin_type
  const { data: parentDoc } = await supabase.from("documents").select("origin_type").eq("id", params.documentId).single();
  const isExternal = parentDoc?.origin_type === "externe";
  const verificationStatus: ExternalVerificationStatus = isExternal ? "a_verifier" : "verifie";

  // Récupération des révisions existantes pour calculer le code suivant
  const { data: existingRevisions, error: fetchErr } = await supabase
    .from("document_revisions")
    .select("*")
    .eq("document_id", params.documentId)
    .order("created_at", { ascending: false });

  if (fetchErr || !existingRevisions || existingRevisions.length === 0) {
    return { error: "Document introuvable ou révisions inaccessibles." };
  }

  const latest = existingRevisions[0];

  const { data: nextCode } = await supabase.rpc("calculate_next_revision_code", {
    p_current_code: latest.revision_code,
  });

  const revisionCode = (nextCode as string) || `REV${String(existingRevisions.length).padStart(2, "0")}`;

  let vMajor = latest.version_major || 1;
  let vMinor = latest.version_minor || 0;

  if (params.isMajorVersion) {
    vMajor += 1;
    vMinor = 0;
  } else {
    vMinor += 1;
  }

  // 2. Création de la révision physique (initialement en_revue)
  const { data: revData, error: insertErr } = await supabase
    .from("document_revisions")
    .insert({
      document_id: params.documentId,
      revision_code: revisionCode,
      version_major: vMajor,
      version_minor: vMinor,
      storage_path: params.storagePath,
      change_summary: params.changeSummary,
      status: "en_revue",
      verification_status: verificationStatus,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (insertErr || !revData) return { error: "Erreur lors de la création de la révision." };

  // 3. Log dans l'historique
  await supabase.from("document_history").insert({
    document_id: params.documentId,
    revision_id: revData.id,
    event_type: "revised",
    actor_id: user.id,
    actor_name: profile?.full_name || "Utilisateur",
    details: {
      revision_code: revisionCode,
      change_summary: params.changeSummary,
      storage_path: params.storagePath,
    },
  });

  revalidatePath("/documents");
  revalidatePath(`/documents/${params.documentId}`);
  return { error: null, revisionId: revData.id, revisionCode };
}

export async function setRevisionStatus(revisionId: string, newStatus: DocumentStatus): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Session expirée" };

  if (newStatus === "en_vigueur") {
    const { error: rpcErr } = await supabase.rpc("set_revision_in_vigueur", {
      p_revision_id: revisionId,
      p_actor_id: user.id,
    });
    if (rpcErr) return { error: `Erreur d'activation de la version: ${rpcErr.message}` };
  } else {
    const { error: updateErr } = await supabase
      .from("document_revisions")
      .update({ status: newStatus })
      .eq("id", revisionId);

    if (updateErr) return { error: "Impossible de modifier le statut de la révision." };
  }

  revalidatePath("/documents");
  return { error: null };
}

export async function listDocumentRevisions(documentId: string): Promise<DocumentRevision[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("document_revisions")
    .select("*, verifier:profiles!document_revisions_verified_by_fkey(full_name)")
    .eq("document_id", documentId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return Promise.all(
    data.map(async (row) => {
      let url: string | null = null;
      let signedUrl: string | null = null;

      if (row.storage_path) {
        const { data: s } = await supabase.storage.from(BUCKET).createSignedUrl(row.storage_path, SIGNED_URL_TTL_SECONDS);
        url = s?.signedUrl ?? null;
      }
      if (row.signed_storage_path) {
        const { data: s } = await supabase.storage.from(BUCKET).createSignedUrl(row.signed_storage_path, SIGNED_URL_TTL_SECONDS);
        signedUrl = s?.signedUrl ?? null;
      }

      const verifierObj = row.verifier as unknown as { full_name: string } | null;

      return {
        id: row.id,
        companyId: row.company_id,
        documentId: row.document_id,
        revisionCode: row.revision_code,
        versionMajor: row.version_major,
        versionMinor: row.version_minor,
        storagePath: row.storage_path,
        signedStoragePath: row.signed_storage_path,
        changeSummary: row.change_summary,
        status: row.status as DocumentStatus,
        verificationStatus: (row.verification_status as ExternalVerificationStatus) || "verifie",
        verifiedBy: row.verified_by ?? null,
        verifiedByName: verifierObj?.full_name || null,
        verifiedAt: row.verified_at ?? null,
        rejectionReason: row.rejection_reason ?? null,
        rejectionCategory: (row.rejection_category as RejectionCategory) ?? null,
        createdBy: row.created_by,
        createdAt: row.created_at,
        url,
        signedUrl,
      };
    }),
  );
}

export async function getDocumentRevisions(documentId: string): Promise<DocumentRevision[]> {
  return listDocumentRevisions(documentId);
}

export async function getCurrentRevision(documentId: string): Promise<DocumentRevision | null> {
  const revisions = await listDocumentRevisions(documentId);
  const active = revisions.find((r) => r.status === "en_vigueur");
  return active || revisions[0] || null;
}

// ----------------------------------------------------------------------------
// STATUT GLOBAL ET ARCHIVAGE DOCUMENTAIRE
// ----------------------------------------------------------------------------

export async function setDocumentStatus(documentId: string, status: DocumentStatus): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();

  const { error } = await supabase.from("documents").update({ status, updated_at: new Date().toISOString() }).eq("id", documentId);
  if (error) return { error: "Impossible de modifier le statut du document." };

  await supabase.from("document_history").insert({
    document_id: documentId,
    event_type: "status_changed",
    actor_id: user.id,
    actor_name: profile?.full_name || "Utilisateur",
    details: { new_status: status },
  });

  revalidatePath("/documents");
  revalidatePath(`/documents/${documentId}`);
  return { error: null };
}

export async function archiveDocument(documentId: string): Promise<ActionResult> {
  return setDocumentStatus(documentId, "archive");
}

export async function restoreDocument(documentId: string): Promise<ActionResult> {
  return setDocumentStatus(documentId, "en_vigueur");
}

// ----------------------------------------------------------------------------
// GED V2 — DOSSIERS, LIENS, SIGNATURES ET HISTORIQUE
// ----------------------------------------------------------------------------

export async function listDocumentFolders(): Promise<DocumentFolder[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("document_folders")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id,
    companyId: row.company_id,
    parentId: row.parent_id,
    name: row.name,
    codePrefix: row.code_prefix,
    description: row.description,
    icon: row.icon,
    sortOrder: row.sort_order,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function createDocumentFolder(
  name: string,
  parentId?: string | null,
  description?: string,
  codePrefix?: string,
  icon?: string,
): Promise<ActionResult & { folderId?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const { data, error } = await supabase
    .from("document_folders")
    .insert({
      name,
      parent_id: parentId || null,
      description: description || "",
      code_prefix: codePrefix || null,
      icon: icon || "folder",
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !data) return { error: "Impossible de créer le dossier." };

  revalidatePath("/documents");
  return { error: null, folderId: data.id };
}

export async function linkDocumentToEntity(
  documentId: string,
  entityType: string,
  entityId: string,
  relationshipType = "attachment",
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("document_links").insert({
    document_id: documentId,
    entity_type: entityType,
    entity_id: entityId,
    relationship_type: relationshipType,
    created_by: user?.id || null,
  });

  if (error) return { error: "Impossible de lier le document." };
  return { error: null };
}

export async function listDocumentLinks(documentId: string): Promise<DocumentLink[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("document_links").select("*").eq("document_id", documentId);

  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id,
    companyId: row.company_id,
    documentId: row.document_id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    relationshipType: row.relationship_type,
    createdBy: row.created_by,
    createdAt: row.created_at,
  }));
}

export async function listDocumentSignatures(documentId: string): Promise<DocumentSignature[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("document_signatures")
    .select("*")
    .eq("document_id", documentId)
    .order("created_at", { ascending: true });

  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id,
    companyId: row.company_id,
    documentId: row.document_id,
    revisionId: row.revision_id,
    signerType: row.signer_type,
    signerId: row.signer_id,
    signerName: row.signer_name,
    signerRole: row.signer_role,
    signerEmail: row.signer_email,
    signatureMode: row.signature_mode,
    signatureStoragePath: row.signature_storage_path,
    signatureStatus: row.signature_status,
    rejectionReason: row.rejection_reason,
    signedAt: row.signed_at,
    signedIp: row.signed_ip,
    stepOrder: row.step_order,
    createdAt: row.created_at,
  }));
}

export async function listDocumentHistory(documentId: string): Promise<DocumentHistoryEvent[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("document_history")
    .select("*")
    .eq("document_id", documentId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id,
    companyId: row.company_id,
    documentId: row.document_id,
    revisionId: row.revision_id,
    eventType: row.event_type,
    actorId: row.actor_id,
    actorName: row.actor_name,
    details: row.details,
    createdAt: row.created_at,
  }));
}

// ----------------------------------------------------------------------------
// WORKFLOW DOCUMENTAIRE, SIGNATURES ET CIRCUIT PAPIER (PHASE E)
// ----------------------------------------------------------------------------

export async function requestDocumentSignature(params: {
  documentId: string;
  revisionId: string;
  signerName: string;
  signerRole?: string;
  signerEmail?: string;
  signerId?: string;
  signatureMode?: "digital_handwritten" | "paper_scan";
}): Promise<ActionResult & { signatureId?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Session expirée" };

  const { data: sigId, error } = await supabase.rpc("request_document_signature", {
    p_document_id: params.documentId,
    p_revision_id: params.revisionId,
    p_signer_name: params.signerName,
    p_signer_role: params.signerRole || "",
    p_signer_email: params.signerEmail || "",
    p_signer_id: params.signerId || user.id,
    p_signature_mode: params.signatureMode || "digital_handwritten",
  });

  if (error) return { error: `Erreur demande signature: ${error.message}` };

  revalidatePath("/documents");
  revalidatePath(`/documents/${params.documentId}`);
  return { error: null, signatureId: sigId as string };
}

export async function executeDocumentSignature(params: {
  signatureId: string;
  documentId: string;
  signatureStoragePath?: string;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("execute_document_signature", {
    p_signature_id: params.signatureId,
    p_signature_storage_path: params.signatureStoragePath || null,
  });

  if (error) return { error: `Erreur exécution signature: ${error.message}` };

  revalidatePath("/documents");
  revalidatePath(`/documents/${params.documentId}`);
  return { error: null };
}

export async function uploadSignedPaperDocument(params: {
  documentId: string;
  revisionId: string;
  signedStoragePath: string;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Session expirée" };

  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();

  // 1. Mise à jour du chemin du fichier signé sur la révision SANS toucher au fichier original storage_path
  const { error: revErr } = await supabase
    .from("document_revisions")
    .update({ signed_storage_path: params.signedStoragePath })
    .eq("id", params.revisionId);

  if (revErr) return { error: "Impossible de rattacher le document papier signé à la révision." };

  // 2. Logging dans l'historique immuable
  await supabase.from("document_history").insert({
    document_id: params.documentId,
    revision_id: params.revisionId,
    event_type: "paper_signed_uploaded",
    actor_id: user.id,
    actor_name: profile?.full_name || "Utilisateur",
    details: {
      signed_storage_path: params.signedStoragePath,
    },
  });

  revalidatePath("/documents");
  revalidatePath(`/documents/${params.documentId}`);
  return { error: null };
}

export async function updateRevisionWorkflowStatus(params: {
  documentId: string;
  revisionId: string;
  newStatus: DocumentStatus;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Session expirée" };

  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();

  if (params.newStatus === "en_vigueur") {
    const { error: rpcErr } = await supabase.rpc("set_revision_in_vigueur", {
      p_revision_id: params.revisionId,
      p_actor_id: user.id,
    });
    if (rpcErr) return { error: rpcErr.message };
  } else {
    const { error: updateErr } = await supabase
      .from("document_revisions")
      .update({ status: params.newStatus })
      .eq("id", params.revisionId);

    if (updateErr) return { error: "Impossible d'actualiser le statut de la révision." };

    await supabase.from("documents").update({ status: params.newStatus, updated_at: new Date().toISOString() }).eq("id", params.documentId);
  }

  await supabase.from("document_history").insert({
    document_id: params.documentId,
    revision_id: params.revisionId,
    event_type: "status_changed",
    actor_id: user.id,
    actor_name: profile?.full_name || "Utilisateur",
    details: { new_status: params.newStatus },
  });

  revalidatePath("/documents");
  revalidatePath(`/documents/${params.documentId}`);
  return { error: null };
}

// ----------------------------------------------------------------------------
// PHASE L — MAÎTRISE DOCUMENTAIRE ISO 7.5 (VÉRIFICATION, REGISTRE & CONSERVATION)
// ----------------------------------------------------------------------------

export async function verifyExternalDocument(
  revisionId: string,
  comment?: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Session expirée" };

  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();

  const { data: revision, error: fetchErr } = await supabase
    .from("document_revisions")
    .select("id, document_id, revision_code")
    .eq("id", revisionId)
    .single();

  if (fetchErr || !revision) return { error: "Révision introuvable." };

  const { error: updateErr } = await supabase
    .from("document_revisions")
    .update({
      verification_status: "verifie",
      verified_by: user.id,
      verified_at: new Date().toISOString(),
      rejection_reason: null,
      rejection_category: null,
    })
    .eq("id", revisionId);

  if (updateErr) return { error: `Impossible de vérifier la révision: ${updateErr.message}` };

  await supabase.from("document_history").insert({
    document_id: revision.document_id,
    revision_id: revisionId,
    event_type: "external_document_verified",
    actor_id: user.id,
    actor_name: profile?.full_name || "Utilisateur",
    details: {
      revision_code: revision.revision_code,
      comment: comment || null,
    },
  });

  revalidatePath("/documents");
  revalidatePath(`/documents/${revision.document_id}`);
  revalidatePath("/documents/registre");
  return { error: null };
}

export async function rejectExternalDocument(params: {
  revisionId: string;
  rejectionCategory: RejectionCategory;
  rejectionReason: string;
}): Promise<ActionResult> {
  if (!params.rejectionReason || params.rejectionReason.trim().length === 0) {
    return { error: "Le motif du rejet est obligatoire." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Session expirée" };

  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();

  const { data: revision, error: fetchErr } = await supabase
    .from("document_revisions")
    .select("id, document_id, revision_code")
    .eq("id", params.revisionId)
    .single();

  if (fetchErr || !revision) return { error: "Révision introuvable." };

  const { error: updateErr } = await supabase
    .from("document_revisions")
    .update({
      verification_status: "rejete",
      verified_by: user.id,
      verified_at: new Date().toISOString(),
      rejection_category: params.rejectionCategory,
      rejection_reason: params.rejectionReason.trim(),
    })
    .eq("id", params.revisionId);

  if (updateErr) return { error: `Impossible de rejeter la révision: ${updateErr.message}` };

  await supabase.from("document_history").insert({
    document_id: revision.document_id,
    revision_id: params.revisionId,
    event_type: "external_document_rejected",
    actor_id: user.id,
    actor_name: profile?.full_name || "Utilisateur",
    details: {
      revision_code: revision.revision_code,
      rejection_category: params.rejectionCategory,
      rejection_reason: params.rejectionReason.trim(),
    },
  });

  revalidatePath("/documents");
  revalidatePath(`/documents/${revision.document_id}`);
  revalidatePath("/documents/registre");
  return { error: null };
}

export async function listDocumentRegistry(options?: DocumentFilterOptions): Promise<QhseDocument[]> {
  const docs = await listDocuments(options);
  if (docs.length === 0) return [];

  const supabase = await createClient();
  const docIds = docs.map((d) => d.id);

  const { data: revs } = await supabase
    .from("document_revisions")
    .select("document_id, revision_code, status, verification_status")
    .in("document_id", docIds);

  const verificationMap = new Map<string, ExternalVerificationStatus>();
  if (revs) {
    for (const r of revs) {
      if (r.status === "en_vigueur" || !verificationMap.has(r.document_id)) {
        verificationMap.set(r.document_id, (r.verification_status as ExternalVerificationStatus) || "verifie");
      }
    }
  }

  let filteredDocs = await Promise.all(
    docs.map(async (doc) => {
      const calculatedState = await calculateDocumentState(doc.reviewDate, doc.expiryDate);
      const activeRevisionVerification =
        verificationMap.get(doc.id) || (doc.originType === "externe" ? "a_verifier" : "verifie");

      return {
        ...doc,
        calculatedState,
        activeRevisionVerification,
      };
    })
  );

  if (options?.verificationStatus && options.verificationStatus !== "all") {
    filteredDocs = filteredDocs.filter((d) => d.activeRevisionVerification === options.verificationStatus);
  }

  return filteredDocs;
}

export async function getCompanyRetentionPolicies(): Promise<DocumentRetentionPolicy[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("document_retention_policies")
    .select("*")
    .order("document_type", { ascending: true });

  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id,
    companyId: row.company_id,
    documentType: row.document_type as DocumentType | "default",
    retentionYears: row.retention_years,
    retentionUnit: row.retention_unit as "ans" | "mois" | "indefini",
    description: row.description ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function upsertRetentionPolicy(params: {
  documentType: DocumentType | "default";
  retentionYears: number;
  retentionUnit?: "ans" | "mois" | "indefini";
  description?: string;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const { data: profile } = await supabase.from("profiles").select("company_id").eq("id", user.id).single();
  if (!profile?.company_id) return { error: "Profil société introuvable" };

  const { error } = await supabase.from("document_retention_policies").upsert(
    {
      company_id: profile.company_id,
      document_type: params.documentType,
      retention_years: params.retentionYears,
      retention_unit: params.retentionUnit || "ans",
      description: params.description || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "company_id,document_type" }
  );

  if (error) return { error: `Erreur enregistrement politique de conservation: ${error.message}` };

  revalidatePath("/documents");
  revalidatePath("/documents/registre");
  return { error: null };
}

