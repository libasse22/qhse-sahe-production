export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      actions_correctives: {
        Row: {
          created_at: string
          description: string
          echeance: string
          id: string
          incident_id: string
          responsable_id: string
          status: Database["public"]["Enums"]["action_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          echeance: string
          id?: string
          incident_id: string
          responsable_id: string
          status?: Database["public"]["Enums"]["action_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          echeance?: string
          id?: string
          incident_id?: string
          responsable_id?: string
          status?: Database["public"]["Enums"]["action_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "actions_correctives_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "actions_correctives_responsable_id_fkey"
            columns: ["responsable_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          app_name: string
          id: boolean
          logo_storage_path: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          app_name?: string
          id?: boolean
          logo_storage_path?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          app_name?: string
          id?: boolean
          logo_storage_path?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "app_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_findings: {
        Row: {
          action_id: string | null
          audit_id: string
          created_at: string
          created_by: string
          description: string
          id: string
          type: Database["public"]["Enums"]["finding_type"]
        }
        Insert: {
          action_id?: string | null
          audit_id: string
          created_at?: string
          created_by: string
          description: string
          id?: string
          type?: Database["public"]["Enums"]["finding_type"]
        }
        Update: {
          action_id?: string | null
          audit_id?: string
          created_at?: string
          created_by?: string
          description?: string
          id?: string
          type?: Database["public"]["Enums"]["finding_type"]
        }
        Relationships: [
          {
            foreignKeyName: "audit_findings_action_id_fkey"
            columns: ["action_id"]
            isOneToOne: false
            referencedRelation: "actions_correctives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_findings_audit_id_fkey"
            columns: ["audit_id"]
            isOneToOne: false
            referencedRelation: "audits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_findings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audits: {
        Row: {
          auditor_id: string
          created_at: string
          created_by: string
          criteria: string
          id: string
          planned_date: string
          scope: string
          status: Database["public"]["Enums"]["audit_status"]
          title: string
          updated_at: string
        }
        Insert: {
          auditor_id: string
          created_at?: string
          created_by: string
          criteria?: string
          id?: string
          planned_date: string
          scope?: string
          status?: Database["public"]["Enums"]["audit_status"]
          title: string
          updated_at?: string
        }
        Update: {
          auditor_id?: string
          created_at?: string
          created_by?: string
          criteria?: string
          id?: string
          planned_date?: string
          scope?: string
          status?: Database["public"]["Enums"]["audit_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "audits_auditor_id_fkey"
            columns: ["auditor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audits_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      compliance_obligations: {
        Row: {
          created_at: string
          created_by: string
          description: string
          id: string
          review_date: string | null
          source: string
          status: Database["public"]["Enums"]["compliance_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description: string
          id?: string
          review_date?: string | null
          source?: string
          status?: Database["public"]["Enums"]["compliance_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string
          id?: string
          review_date?: string | null
          source?: string
          status?: Database["public"]["Enums"]["compliance_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "compliance_obligations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          category: string
          created_at: string
          id: string
          storage_path: string
          title: string
          uploaded_by: string
          version: number
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          storage_path: string
          title: string
          uploaded_by: string
          version?: number
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          storage_path?: string
          title?: string
          uploaded_by?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment: {
        Row: {
          category: string
          created_at: string
          created_by: string
          id: string
          name: string
          serial_number: string
          site_id: string | null
          status: Database["public"]["Enums"]["equipment_status"]
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          created_by: string
          id?: string
          name: string
          serial_number?: string
          site_id?: string | null
          status?: Database["public"]["Enums"]["equipment_status"]
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          serial_number?: string
          site_id?: string | null
          status?: Database["public"]["Enums"]["equipment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      incident_photos: {
        Row: {
          client_generated_id: string | null
          created_at: string
          id: string
          incident_id: string
          storage_path: string
          uploaded_by: string
        }
        Insert: {
          client_generated_id?: string | null
          created_at?: string
          id?: string
          incident_id: string
          storage_path: string
          uploaded_by: string
        }
        Update: {
          client_generated_id?: string | null
          created_at?: string
          id?: string
          incident_id?: string
          storage_path?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "incident_photos_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_photos_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      incident_voice_notes: {
        Row: {
          client_generated_id: string | null
          created_at: string
          duration_seconds: number | null
          id: string
          incident_id: string
          storage_path: string
          uploaded_by: string
        }
        Insert: {
          client_generated_id?: string | null
          created_at?: string
          duration_seconds?: number | null
          id?: string
          incident_id: string
          storage_path: string
          uploaded_by: string
        }
        Update: {
          client_generated_id?: string | null
          created_at?: string
          duration_seconds?: number | null
          id?: string
          incident_id?: string
          storage_path?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "incident_voice_notes_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_voice_notes_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      incidents: {
        Row: {
          assigned_to: string | null
          category: Database["public"]["Enums"]["incident_category"]
          client_generated_id: string | null
          created_at: string
          description: string | null
          equipment_id: string | null
          id: string
          location: string
          occurred_at: string
          reported_by: string
          severity: Database["public"]["Enums"]["incident_severity"]
          site_id: string | null
          status: Database["public"]["Enums"]["incident_status"]
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          category?: Database["public"]["Enums"]["incident_category"]
          client_generated_id?: string | null
          created_at?: string
          description?: string | null
          equipment_id?: string | null
          id?: string
          location?: string
          occurred_at?: string
          reported_by: string
          severity?: Database["public"]["Enums"]["incident_severity"]
          site_id?: string | null
          status?: Database["public"]["Enums"]["incident_status"]
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          category?: Database["public"]["Enums"]["incident_category"]
          client_generated_id?: string | null
          created_at?: string
          description?: string | null
          equipment_id?: string | null
          id?: string
          location?: string
          occurred_at?: string
          reported_by?: string
          severity?: Database["public"]["Enums"]["incident_severity"]
          site_id?: string | null
          status?: Database["public"]["Enums"]["incident_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "incidents_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      interested_parties: {
        Row: {
          category: string
          created_at: string
          created_by: string
          expectations: string
          id: string
          name: string
        }
        Insert: {
          category?: string
          created_at?: string
          created_by: string
          expectations?: string
          id?: string
          name: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string
          expectations?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "interested_parties_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      management_reviews: {
        Row: {
          created_at: string
          created_by: string
          decisions: string
          id: string
          review_date: string
          summary: string
          title: string
        }
        Insert: {
          created_at?: string
          created_by: string
          decisions?: string
          id?: string
          review_date: string
          summary?: string
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string
          decisions?: string
          id?: string
          review_date?: string
          summary?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "management_reviews_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          message: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          category: string
          code: string
          id: string
          label: string
        }
        Insert: {
          category: string
          code: string
          id?: string
          label: string
        }
        Update: {
          category?: string
          code?: string
          id?: string
          label?: string
        }
        Relationships: []
      }
      policy_acknowledgements: {
        Row: {
          acknowledged_at: string
          id: string
          policy_id: string
          user_id: string
        }
        Insert: {
          acknowledged_at?: string
          id?: string
          policy_id: string
          user_id: string
        }
        Update: {
          acknowledged_at?: string
          id?: string
          policy_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "policy_acknowledgements_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "qhse_policies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policy_acknowledgements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          company_id: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          role_id: string | null
          site_id: string | null
          status: Database["public"]["Enums"]["user_status"]
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          email: string
          full_name?: string
          id: string
          role?: Database["public"]["Enums"]["user_role"]
          role_id?: string | null
          site_id?: string | null
          status?: Database["public"]["Enums"]["user_status"]
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          role_id?: string | null
          site_id?: string | null
          status?: Database["public"]["Enums"]["user_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      qhse_objectives: {
        Row: {
          created_at: string
          created_by: string
          current_value: number
          deadline: string
          description: string
          id: string
          owner_id: string | null
          status: Database["public"]["Enums"]["objective_status"]
          target_value: number
          title: string
          unit: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          current_value?: number
          deadline: string
          description?: string
          id?: string
          owner_id?: string | null
          status?: Database["public"]["Enums"]["objective_status"]
          target_value: number
          title: string
          unit?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          current_value?: number
          deadline?: string
          description?: string
          id?: string
          owner_id?: string | null
          status?: Database["public"]["Enums"]["objective_status"]
          target_value?: number
          title?: string
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "qhse_objectives_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qhse_objectives_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      qhse_policies: {
        Row: {
          content: string | null
          created_at: string
          created_by: string
          id: string
          is_active: boolean
          pdf_storage_path: string | null
          title: string
          version: number
        }
        Insert: {
          content?: string | null
          created_at?: string
          created_by: string
          id?: string
          is_active?: boolean
          pdf_storage_path?: string | null
          title: string
          version: number
        }
        Update: {
          content?: string | null
          created_at?: string
          created_by?: string
          id?: string
          is_active?: boolean
          pdf_storage_path?: string | null
          title?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "qhse_policies_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      risks: {
        Row: {
          category: Database["public"]["Enums"]["risk_category"]
          created_at: string
          created_by: string
          criticality: number | null
          description: string
          gravity: number
          id: string
          owner_id: string | null
          probability: number
          status: Database["public"]["Enums"]["risk_status"]
          title: string
          treatment: string
          updated_at: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["risk_category"]
          created_at?: string
          created_by: string
          criticality?: number | null
          description?: string
          gravity: number
          id?: string
          owner_id?: string | null
          probability: number
          status?: Database["public"]["Enums"]["risk_status"]
          title: string
          treatment?: string
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["risk_category"]
          created_at?: string
          created_by?: string
          criticality?: number | null
          description?: string
          gravity?: number
          id?: string
          owner_id?: string | null
          probability?: number
          status?: Database["public"]["Enums"]["risk_status"]
          title?: string
          treatment?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "risks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risks_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          permission_id: string
          role_id: string
        }
        Insert: {
          permission_id: string
          role_id: string
        }
        Update: {
          permission_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          base_bucket: Database["public"]["Enums"]["user_role"]
          created_at: string
          description: string
          id: string
          is_system: boolean
          name: string
        }
        Insert: {
          base_bucket: Database["public"]["Enums"]["user_role"]
          created_at?: string
          description?: string
          id?: string
          is_system?: boolean
          name: string
        }
        Update: {
          base_bucket?: Database["public"]["Enums"]["user_role"]
          created_at?: string
          description?: string
          id?: string
          is_system?: boolean
          name?: string
        }
        Relationships: []
      }
      sites: {
        Row: {
          address: string
          company_id: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          address?: string
          company_id: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          address?: string
          company_id?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "sites_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_permission: { Args: { permission_code: string }; Returns: boolean }
      is_admin: { Args: never; Returns: boolean }
      is_qhse_or_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      action_status: "a_faire" | "en_cours" | "termine"
      audit_status: "planifie" | "en_cours" | "termine"
      compliance_status: "conforme" | "non_conforme" | "a_verifier"
      equipment_status: "operationnel" | "maintenance" | "hors_service"
      finding_type:
        | "conformite"
        | "non_conformite_mineure"
        | "non_conformite_majeure"
        | "point_sensible"
      incident_category:
        | "accident_travail"
        | "presque_accident"
        | "risque_identifie"
        | "non_conformite"
        | "environnement"
        | "materiel"
        | "autre"
      incident_severity: "faible" | "moyenne" | "elevee" | "critique"
      incident_status: "declare" | "en_cours" | "resolu" | "cloture"
      objective_status: "en_cours" | "atteint" | "non_atteint"
      risk_category: "qualite" | "securite" | "environnement" | "autre"
      risk_status: "identifie" | "en_traitement" | "maitrise" | "cloture"
      user_role: "admin" | "manager_qhse" | "employe"
      user_status: "pending" | "active" | "suspended"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      action_status: ["a_faire", "en_cours", "termine"],
      audit_status: ["planifie", "en_cours", "termine"],
      compliance_status: ["conforme", "non_conforme", "a_verifier"],
      equipment_status: ["operationnel", "maintenance", "hors_service"],
      finding_type: [
        "conformite",
        "non_conformite_mineure",
        "non_conformite_majeure",
        "point_sensible",
      ],
      incident_category: [
        "accident_travail",
        "presque_accident",
        "risque_identifie",
        "non_conformite",
        "environnement",
        "materiel",
        "autre",
      ],
      incident_severity: ["faible", "moyenne", "elevee", "critique"],
      incident_status: ["declare", "en_cours", "resolu", "cloture"],
      objective_status: ["en_cours", "atteint", "non_atteint"],
      risk_category: ["qualite", "securite", "environnement", "autre"],
      risk_status: ["identifie", "en_traitement", "maitrise", "cloture"],
      user_role: ["admin", "manager_qhse", "employe"],
      user_status: ["pending", "active", "suspended"],
    },
  },
} as const
