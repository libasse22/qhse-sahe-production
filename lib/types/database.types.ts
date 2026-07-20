// Types miroir des migrations supabase/migrations/*.sql
// À régénérer/étendre à chaque nouvelle migration.

export type UserRole = "admin" | "manager_qhse" | "employe";
export type UserStatus = "pending" | "active" | "suspended";

export type IncidentCategory =
  | "accident_travail"
  | "presque_accident"
  | "risque_identifie"
  | "non_conformite"
  | "environnement"
  | "materiel"
  | "autre";

export type IncidentSeverity = "faible" | "moyenne" | "elevee" | "critique";
export type IncidentStatus = "declare" | "en_cours" | "resolu" | "cloture";
export type ActionStatus = "a_faire" | "en_cours" | "termine";
export type AuditStatus = "planifie" | "en_cours" | "termine";
export type FindingType = "conformite" | "non_conformite_mineure" | "non_conformite_majeure" | "point_sensible";
export type RiskCategory = "qualite" | "securite" | "environnement" | "autre";
export type RiskStatus = "identifie" | "en_traitement" | "maitrise" | "cloture";
export type ObjectiveStatus = "en_cours" | "atteint" | "non_atteint";
export type ComplianceStatus = "conforme" | "non_conforme" | "a_verifier";
export type EquipmentStatus = "operationnel" | "maintenance" | "hors_service";

export interface Database {
  public: {
    Tables: {
      companies: {
        Row: { id: string; name: string; created_at: string };
        Insert: { id?: string; name: string };
        Update: { name?: string };
      };
      sites: {
        Row: { id: string; company_id: string; name: string; address: string; created_at: string };
        Insert: { id?: string; company_id: string; name: string; address?: string };
        Update: { name?: string; address?: string };
      };
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          role: UserRole;
          status: UserStatus;
          company_id: string | null;
          site_id: string | null;
          role_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string;
          role?: UserRole;
          status?: UserStatus;
          company_id?: string | null;
          site_id?: string | null;
          role_id?: string | null;
        };
        Update: {
          full_name?: string;
          role?: UserRole;
          status?: UserStatus;
          company_id?: string | null;
          site_id?: string | null;
          role_id?: string | null;
        };
      };
      incidents: {
        Row: {
          id: string;
          title: string;
          description: string;
          category: IncidentCategory;
          severity: IncidentSeverity;
          status: IncidentStatus;
          location: string;
          occurred_at: string;
          reported_by: string;
          assigned_to: string | null;
          site_id: string | null;
          client_generated_id: string | null;
          equipment_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string;
          category?: IncidentCategory;
          severity?: IncidentSeverity;
          status?: IncidentStatus;
          location?: string;
          occurred_at?: string;
          reported_by: string;
          assigned_to?: string | null;
          site_id?: string | null;
          client_generated_id?: string | null;
          equipment_id?: string | null;
        };
        Update: {
          title?: string;
          description?: string;
          category?: IncidentCategory;
          severity?: IncidentSeverity;
          status?: IncidentStatus;
          location?: string;
          occurred_at?: string;
          assigned_to?: string | null;
          site_id?: string | null;
        };
      };
      actions_correctives: {
        Row: {
          id: string;
          incident_id: string;
          description: string;
          responsable_id: string;
          echeance: string;
          status: ActionStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          incident_id: string;
          description: string;
          responsable_id: string;
          echeance: string;
          status?: ActionStatus;
        };
        Update: {
          description?: string;
          responsable_id?: string;
          echeance?: string;
          status?: ActionStatus;
        };
      };
      incident_photos: {
        Row: {
          id: string;
          incident_id: string;
          storage_path: string;
          uploaded_by: string;
          client_generated_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          incident_id: string;
          storage_path: string;
          uploaded_by: string;
          client_generated_id?: string | null;
        };
        Update: Record<string, never>;
      };
      incident_voice_notes: {
        Row: {
          id: string;
          incident_id: string;
          storage_path: string;
          duration_seconds: number | null;
          uploaded_by: string;
          client_generated_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          incident_id: string;
          storage_path: string;
          duration_seconds?: number | null;
          uploaded_by: string;
          client_generated_id?: string | null;
        };
        Update: Record<string, never>;
      };
      qhse_policies: {
        Row: {
          id: string;
          title: string;
          content: string;
          version: number;
          is_active: boolean;
          created_by: string;
          created_at: string;
          pdf_storage_path: string | null;
        };
        Insert: {
          id?: string;
          title: string;
          content?: string;
          version: number;
          is_active?: boolean;
          created_by: string;
          pdf_storage_path?: string | null;
        };
        Update: { is_active?: boolean; pdf_storage_path?: string | null };
      };
      policy_acknowledgements: {
        Row: { id: string; policy_id: string; user_id: string; acknowledged_at: string };
        Insert: { id?: string; policy_id: string; user_id: string };
        Update: Record<string, never>;
      };
      audits: {
        Row: {
          id: string;
          title: string;
          scope: string;
          criteria: string;
          auditor_id: string;
          planned_date: string;
          status: AuditStatus;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          scope?: string;
          criteria?: string;
          auditor_id: string;
          planned_date: string;
          status?: AuditStatus;
          created_by: string;
        };
        Update: { status?: AuditStatus };
      };
      audit_findings: {
        Row: {
          id: string;
          audit_id: string;
          type: FindingType;
          description: string;
          action_id: string | null;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          audit_id: string;
          type: FindingType;
          description: string;
          action_id?: string | null;
          created_by: string;
        };
        Update: Record<string, never>;
      };
      risks: {
        Row: {
          id: string;
          title: string;
          description: string;
          category: RiskCategory;
          probability: number;
          gravity: number;
          criticality: number;
          treatment: string;
          owner_id: string | null;
          status: RiskStatus;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string;
          category?: RiskCategory;
          probability: number;
          gravity: number;
          treatment?: string;
          owner_id?: string | null;
          status?: RiskStatus;
          created_by: string;
        };
        Update: {
          description?: string;
          category?: RiskCategory;
          probability?: number;
          gravity?: number;
          treatment?: string;
          owner_id?: string | null;
          status?: RiskStatus;
        };
      };
      qhse_objectives: {
        Row: {
          id: string;
          title: string;
          description: string;
          unit: string;
          target_value: number;
          current_value: number;
          deadline: string;
          status: ObjectiveStatus;
          owner_id: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string;
          unit?: string;
          target_value: number;
          current_value?: number;
          deadline: string;
          status?: ObjectiveStatus;
          owner_id?: string | null;
          created_by: string;
        };
        Update: { current_value?: number; status?: ObjectiveStatus };
      };
      interested_parties: {
        Row: { id: string; name: string; category: string; expectations: string; created_by: string; created_at: string };
        Insert: { id?: string; name: string; category?: string; expectations?: string; created_by: string };
        Update: Record<string, never>;
      };
      compliance_obligations: {
        Row: {
          id: string;
          description: string;
          source: string;
          status: ComplianceStatus;
          review_date: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          description: string;
          source?: string;
          status?: ComplianceStatus;
          review_date?: string | null;
          created_by: string;
        };
        Update: { status?: ComplianceStatus };
      };
      management_reviews: {
        Row: {
          id: string;
          title: string;
          review_date: string;
          summary: string;
          decisions: string;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          review_date: string;
          summary?: string;
          decisions?: string;
          created_by: string;
        };
        Update: Record<string, never>;
      };
      documents: {
        Row: {
          id: string;
          title: string;
          category: string;
          storage_path: string;
          version: number;
          uploaded_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          category?: string;
          storage_path: string;
          version?: number;
          uploaded_by: string;
        };
        Update: Record<string, never>;
      };
      equipment: {
        Row: {
          id: string;
          name: string;
          category: string;
          serial_number: string;
          site_id: string | null;
          status: EquipmentStatus;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          category?: string;
          serial_number?: string;
          site_id?: string | null;
          status?: EquipmentStatus;
          created_by: string;
        };
        Update: {
          name?: string;
          category?: string;
          serial_number?: string;
          site_id?: string | null;
          status?: EquipmentStatus;
        };
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          message: string;
          link: string | null;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          message?: string;
          link?: string | null;
          is_read?: boolean;
        };
        Update: { is_read?: boolean };
      };
      app_settings: {
        Row: {
          id: boolean;
          app_name: string;
          logo_storage_path: string | null;
          updated_by: string | null;
          updated_at: string;
        };
        Insert: { id?: boolean; app_name?: string; logo_storage_path?: string | null; updated_by?: string | null };
        Update: { app_name?: string; logo_storage_path?: string | null; updated_by?: string | null };
      };
      permissions: {
        Row: { id: string; code: string; label: string; category: string };
        Insert: { id?: string; code: string; label: string; category: string };
        Update: Record<string, never>;
      };
      roles: {
        Row: {
          id: string;
          name: string;
          description: string;
          base_bucket: UserRole;
          is_system: boolean;
          created_at: string;
        };
        Insert: { id?: string; name: string; description?: string; base_bucket: UserRole; is_system?: boolean };
        Update: { name?: string; description?: string; base_bucket?: UserRole };
      };
      role_permissions: {
        Row: { role_id: string; permission_id: string };
        Insert: { role_id: string; permission_id: string };
        Update: Record<string, never>;
      };
    };
  };
}
