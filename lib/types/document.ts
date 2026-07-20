export interface QhseDocument {
  id: string;
  title: string;
  category: string;
  storagePath: string;
  version: number;
  uploadedByName: string;
  createdAt: string;
  url: string | null;
}
