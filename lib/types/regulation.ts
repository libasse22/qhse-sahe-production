export interface InternalRegulation {
  id: string;
  title: string;
  content: string | null;
  version: number;
  isActive: boolean;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  pdfStoragePath: string | null;
  pdfUrl: string | null;
}
