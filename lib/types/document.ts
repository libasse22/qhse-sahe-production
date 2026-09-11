export type DocumentStatus =
  | 'brouillon'
  | 'en_revue'
  | 'en_attente_signature'
  | 'approuve'
  | 'en_vigueur'
  | 'rejete'
  | 'obsolete'
  | 'archive';

export type DocumentType =
  | 'politique'
  | 'procedure'
  | 'instruction'
  | 'formulaire'
  | 'permis'
  | 'rapport'
  | 'audit'
  | 'inspection'
  | 'manuel'
  | 'autre';

export type DomaineQhse = 'securite' | 'environnement' | 'qualite' | 'sante' | 'hygiene' | 'general';

export interface QhseDocument {
  id: string;
  companyId?: string | null;
  codeReference?: string | null;
  folderId?: string | null;
  title: string;
  category: string;
  documentType?: DocumentType;
  domaineQhse?: DomaineQhse;
  storagePath: string;
  version: number;
  versionMajor?: number;
  versionMinor?: number;
  revisionCode?: string;
  status?: DocumentStatus;
  originalFilename?: string | null;
  fileType?: string | null;
  fileSize?: number | null;
  isGenerated?: boolean;
  sourceModule?: string | null;
  sourceEntityId?: string | null;
  effectiveDate?: string | null;
  reviewDate?: string | null;
  expiryDate?: string | null;
  tags?: string[];
  uploadedByName: string;
  createdAt: string;
  updatedAt?: string;
  url: string | null;
}

export interface DocumentFolder {
  id: string;
  companyId?: string | null;
  parentId?: string | null;
  name: string;
  codePrefix?: string | null;
  description?: string;
  icon?: string;
  sortOrder?: number;
  createdBy?: string | null;
  createdAt: string;
  updatedAt?: string;
  children?: DocumentFolder[];
}

export interface DocumentRevision {
  id: string;
  companyId?: string | null;
  documentId: string;
  revisionCode: string;
  versionMajor: number;
  versionMinor: number;
  storagePath: string;
  signedStoragePath?: string | null;
  changeSummary?: string;
  status: DocumentStatus;
  createdBy: string;
  createdAt: string;
  url?: string | null;
  signedUrl?: string | null;
}

export interface DocumentLink {
  id: string;
  companyId?: string | null;
  documentId: string;
  entityType:
    | 'work_permit'
    | 'inspection'
    | 'audit'
    | 'risk'
    | 'incident'
    | 'action_corrective'
    | 'equipment'
    | 'epi'
    | 'management_review'
    | string;
  entityId: string;
  relationshipType: 'attachment' | 'reference' | 'proof' | 'procedure' | string;
  createdBy?: string | null;
  createdAt: string;
}

export type SignatureMode = 'digital_handwritten' | 'paper_scan' | 'imported_signed_document';
export type SignatureStatus = 'pending' | 'signed' | 'rejected';

export interface DocumentSignature {
  id: string;
  companyId?: string | null;
  documentId: string;
  revisionId: string;
  signerType: 'internal_user' | 'external';
  signerId?: string | null;
  signerName: string;
  signerRole?: string;
  signerEmail?: string;
  signatureMode: SignatureMode;
  signatureStoragePath?: string | null;
  signatureStatus: SignatureStatus;
  rejectionReason?: string;
  signedAt?: string | null;
  signedIp?: string | null;
  stepOrder: number;
  createdAt: string;
}

export interface DocumentExternalShare {
  id: string;
  companyId?: string | null;
  documentId: string;
  revisionId?: string | null;
  shareToken: string;
  recipientName: string;
  recipientEmail?: string;
  recipientCompany?: string;
  canView: boolean;
  canSign: boolean;
  canUploadSigned: boolean;
  passcode?: string | null;
  expiresAt: string;
  revokedAt?: string | null;
  accessedAt?: string | null;
  createdBy?: string | null;
  createdAt: string;
}

export type DocumentHistoryEventType =
  | 'created'
  | 'uploaded'
  | 'revised'
  | 'status_changed'
  | 'signature_requested'
  | 'signed'
  | 'paper_signed_uploaded'
  | 'shared_external'
  | 'exported'
  | 'archived'
  | 'restored';

export interface DocumentHistoryEvent {
  id: string;
  companyId?: string | null;
  documentId: string;
  revisionId?: string | null;
  eventType: DocumentHistoryEventType;
  actorId?: string | null;
  actorName: string;
  details?: Record<string, unknown>;
  createdAt: string;
}

export interface DocumentFilterOptions {
  folderId?: string;
  searchQuery?: string;
  status?: DocumentStatus | 'all';
  documentType?: DocumentType | 'all';
  domaineQhse?: DomaineQhse | 'all';
}

export interface DocumentDetails {
  document: QhseDocument;
  folder: DocumentFolder | null;
  revisions: DocumentRevision[];
  links: DocumentLink[];
  history: DocumentHistoryEvent[];
  signatures: DocumentSignature[];
}
