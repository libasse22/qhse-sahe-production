export interface QhsePolicy {
  id: string;
  title: string;
  content: string;
  version: number;
  isActive: boolean;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  pdfStoragePath: string | null;
  pdfUrl: string | null;
}

export interface PolicyAcknowledgementStats {
  totalActiveUsers: number;
  acknowledgedCount: number;
  pendingUsers: { id: string; fullName: string; email: string }[];
}
