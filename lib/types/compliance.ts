export type ComplianceStatus = "conforme" | "non_conforme" | "a_verifier";

export interface InterestedParty {
  id: string;
  name: string;
  category: string;
  expectations: string;
  createdAt: string;
}

export interface ComplianceObligation {
  id: string;
  description: string;
  source: string;
  status: ComplianceStatus;
  reviewDate: string | null;
  createdAt: string;
}

export const COMPLIANCE_STATUS_LABELS: Record<ComplianceStatus, string> = {
  conforme: "Conforme",
  non_conforme: "Non conforme",
  a_verifier: "À vérifier",
};

export const COMPLIANCE_STATUS_BADGE: Record<ComplianceStatus, "success" | "destructive" | "outline"> = {
  conforme: "success",
  non_conforme: "destructive",
  a_verifier: "outline",
};

export const COMPLIANCE_STATUS_ORDER: ComplianceStatus[] = ["conforme", "non_conforme", "a_verifier"];
