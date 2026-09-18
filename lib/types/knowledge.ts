export type KnowledgeSourceType =
  | "cours"
  | "support_formation"
  | "outil_excel"
  | "methode_qhse"
  | "norme_referentiel"
  | "reglementation"
  | "ged_doc"
  | "autre"
  | "course"
  | "methodology"
  | "tool_excel"
  | "standard_reference"
  | "regulation"
  | "internal_document"
  | "template"
  | "other";

export type KnowledgeDomain =
  | "quality"
  | "health_safety"
  | "environment"
  | "risk"
  | "audit"
  | "management"
  | "compliance"
  | "incident"
  | "emergency"
  | "training"
  | "other";

export type KnowledgeStatus = "active" | "inactive" | "archived" | "pending" | "error";

export type KnowledgePriority = "low" | "medium" | "high" | "critical" | 1 | 2 | 3;

export type KnowledgeChunkType =
  | "text"
  | "table"
  | "methodology"
  | "definition"
  | "formula"
  | "matrix"
  | "procedure"
  | "checklist"
  | "example"
  | "reference";

export interface KnowledgeSource {
  id: string;
  company_id: string | null; // null = Source globale publique
  title: string;
  description?: string | null;
  source_type: KnowledgeSourceType;
  domain: KnowledgeDomain;
  status: KnowledgeStatus;
  priority: KnowledgePriority;
  version: string;
  ged_document_id?: string | null;
  ged_revision_id?: string | null;
  file_path?: string | null;
  file_name?: string | null;
  mime_type?: string | null;
  file_size?: number | null;
  language?: string | null;
  author?: string | null;
  publisher?: string | null;
  publication_date?: string | null;
  standard_organization?: string | null;
  standard_reference?: string | null;
  detected_methods?: string[];
  tags?: string[];
  metadata?: Record<string, any>;
  ingested_at?: string | null;
  ingestion_error?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface KnowledgeChunk {
  id: string;
  company_id: string | null;
  knowledge_source_id: string;
  chunk_index: number;
  content: string;
  title?: string | null;
  section?: string | null;
  page?: number | null;
  sheet_name?: string | null;
  cell_range?: string | null;
  heading?: string | null;
  content_type: KnowledgeChunkType;
  domain?: string | null;
  detected_methods?: string[];
  metadata?: Record<string, any>;
  created_at: string;
}

export interface KnowledgeAuditLog {
  id: string;
  company_id: string | null;
  knowledge_source_id?: string | null;
  event_type: string;
  actor_id?: string | null;
  actor_name?: string | null;
  details?: Record<string, any>;
  created_at: string;
}

export interface KnowledgeFilterOptions {
  searchQuery?: string;
  sourceType?: KnowledgeSourceType | "all";
  domain?: KnowledgeDomain | "all";
  status?: KnowledgeStatus | "all";
  scope?: "all" | "global" | "private";
}

export interface KnowledgeSourceDetails {
  source: KnowledgeSource;
  chunks: KnowledgeChunk[];
  auditLogs: KnowledgeAuditLog[];
  chunkCount: number;
}

export const KNOWLEDGE_SOURCE_TYPE_LABELS: Record<string, string> = {
  cours: "Cours QHSE",
  support_formation: "Support de Formation",
  outil_excel: "Outil Excel / Matrice",
  methode_qhse: "Méthode QHSE",
  norme_referentiel: "Norme / Référentiel ISO",
  reglementation: "Réglementation & Code",
  ged_doc: "Document Interne GED",
  autre: "Autre Ressource",
  methodology: "Méthode & Outil QHSE",
  course: "Cours & Support de Formation",
  tool_excel: "Matrice / Outil Excel",
  standard_reference: "Norme / Référentiel ISO",
  regulation: "Réglementation & Code",
  internal_document: "Document Interne GED",
  template: "Modèle / Trame",
  other: "Autre Ressource",
};

export const KNOWLEDGE_DOMAIN_LABELS: Record<KnowledgeDomain, string> = {
  quality: "Qualité (ISO 9001)",
  health_safety: "Santé & Sécurité (ISO 45001)",
  environment: "Environnement (ISO 14001)",
  risk: "Gestion des Risques",
  audit: "Audit & Conformité",
  management: "Management & Leadership",
  compliance: "Réglementation & Législation",
  incident: "Gestion des Incidents / Arbre des Causes",
  emergency: "Plan d'Urgence & POI",
  training: "Formation & Causeries",
  other: "Transversal / Général",
};
