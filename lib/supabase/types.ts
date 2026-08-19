export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type MembershipRole = "owner" | "admin" | "officer";
export type MembershipStatus = "pending" | "approved" | "rejected" | "removed";
export type PlanId = "free" | "standard" | "pro";
export type ReportStatus = "draft" | "submitted" | "finalized";
export type FormSection =
  | "incident_location"
  | "emergency_services"
  | "victim_injury"
  | "vehicles"
  | "property_damage"
  | "incident_details"
  | "admin_header";
export type QuestionFieldType =
  | "text"
  | "number"
  | "date"
  | "boolean"
  | "dropdown"
  | "multi_select";
export type AgencyKind = "police" | "fire" | "fire_rescue";
export type PersonKind = "victim" | "witness" | "other";
export type InjuredPartyType = "resident" | "guest" | "employee" | "trespasser";
export type DamageType =
  | "vehicle"
  | "building"
  | "common_area"
  | "personal_property";
export type MediaKind = "photo" | "video";
export type SubscriptionStatus =
  | "none"
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "unpaid";

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          full_name: string | null;
          email: string;
          phone: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          email: string;
          phone?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          email?: string;
          phone?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      organizations: {
        Row: {
          id: string;
          name: string;
          join_code: string;
          logo_url: string | null;
          banner_url: string | null;
          created_by: string;
          officer_can_view_own_reports: boolean;
          plan_id: PlanId;
          address: string | null;
          agency_name: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          join_code: string;
          logo_url?: string | null;
          banner_url?: string | null;
          created_by: string;
          officer_can_view_own_reports?: boolean;
          plan_id?: PlanId;
          address?: string | null;
          agency_name?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          join_code?: string;
          logo_url?: string | null;
          banner_url?: string | null;
          created_by?: string;
          officer_can_view_own_reports?: boolean;
          plan_id?: PlanId;
          address?: string | null;
          agency_name?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      buildings: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          address: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          address?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          name?: string;
          address?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      building_units: {
        Row: {
          id: string;
          organization_id: string;
          building_id: string;
          unit_number: string;
          label: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          building_id: string;
          unit_number: string;
          label?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          building_id?: string;
          unit_number?: string;
          label?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      memberships: {
        Row: {
          id: string;
          user_id: string;
          organization_id: string;
          role: MembershipRole;
          status: MembershipStatus;
          invited_by: string | null;
          created_at: string;
          approved_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          organization_id: string;
          role?: MembershipRole;
          status?: MembershipStatus;
          invited_by?: string | null;
          created_at?: string;
          approved_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          organization_id?: string;
          role?: MembershipRole;
          status?: MembershipStatus;
          invited_by?: string | null;
          created_at?: string;
          approved_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "memberships_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "memberships_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      audit_log: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string | null;
          report_id: string | null;
          action: string;
          previous_value: Json | null;
          new_value: Json | null;
          reason: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          user_id?: string | null;
          report_id?: string | null;
          action: string;
          previous_value?: Json | null;
          new_value?: Json | null;
          reason?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          user_id?: string | null;
          report_id?: string | null;
          action?: string;
          previous_value?: Json | null;
          new_value?: Json | null;
          reason?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      org_incident_types: {
        Row: {
          id: string;
          organization_id: string;
          slug: string;
          label: string;
          sort_order: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          slug: string;
          label: string;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          slug?: string;
          label?: string;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      org_questions: {
        Row: {
          id: string;
          organization_id: string;
          question_key: string;
          section: FormSection;
          label: string;
          field_type: QuestionFieldType;
          required: boolean;
          is_default: boolean;
          display_order: number;
          version: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          question_key: string;
          section: FormSection;
          label: string;
          field_type: QuestionFieldType;
          required?: boolean;
          is_default?: boolean;
          display_order?: number;
          version?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          question_key?: string;
          section?: FormSection;
          label?: string;
          field_type?: QuestionFieldType;
          required?: boolean;
          is_default?: boolean;
          display_order?: number;
          version?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      org_question_options: {
        Row: {
          id: string;
          question_id: string;
          organization_id: string;
          value: string;
          label: string;
          sort_order: number;
        };
        Insert: {
          id?: string;
          question_id: string;
          organization_id: string;
          value: string;
          label: string;
          sort_order?: number;
        };
        Update: {
          id?: string;
          question_id?: string;
          organization_id?: string;
          value?: string;
          label?: string;
          sort_order?: number;
        };
        Relationships: [];
      };
      org_question_conditions: {
        Row: {
          id: string;
          question_id: string;
          organization_id: string;
          depends_on_question_id: string;
          expected_value: string;
        };
        Insert: {
          id?: string;
          question_id: string;
          organization_id: string;
          depends_on_question_id: string;
          expected_value: string;
        };
        Update: {
          id?: string;
          question_id?: string;
          organization_id?: string;
          depends_on_question_id?: string;
          expected_value?: string;
        };
        Relationships: [];
      };
      reports: {
        Row: {
          id: string;
          organization_id: string;
          report_number: string;
          status: ReportStatus;
          building_id: string | null;
          unit_id: string | null;
          location_detail: string | null;
          incident_type_id: string | null;
          occurred_at: string | null;
          created_by: string;
          submitted_at: string | null;
          finalized_at: string | null;
          original_summary: string | null;
          ai_narrative: string | null;
          final_narrative: string | null;
          officer_signature_path: string | null;
          officer_signed_at: string | null;
          admin_signature_path: string | null;
          admin_signed_at: string | null;
          writer_name: string | null;
          property_address: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          report_number: string;
          status?: ReportStatus;
          building_id?: string | null;
          unit_id?: string | null;
          location_detail?: string | null;
          incident_type_id?: string | null;
          occurred_at?: string | null;
          created_by: string;
          submitted_at?: string | null;
          finalized_at?: string | null;
          original_summary?: string | null;
          ai_narrative?: string | null;
          final_narrative?: string | null;
          officer_signature_path?: string | null;
          officer_signed_at?: string | null;
          admin_signature_path?: string | null;
          admin_signed_at?: string | null;
          writer_name?: string | null;
          property_address?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          report_number?: string;
          status?: ReportStatus;
          building_id?: string | null;
          unit_id?: string | null;
          location_detail?: string | null;
          incident_type_id?: string | null;
          occurred_at?: string | null;
          created_by?: string;
          submitted_at?: string | null;
          finalized_at?: string | null;
          original_summary?: string | null;
          ai_narrative?: string | null;
          final_narrative?: string | null;
          officer_signature_path?: string | null;
          officer_signed_at?: string | null;
          admin_signature_path?: string | null;
          admin_signed_at?: string | null;
          writer_name?: string | null;
          property_address?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      report_agencies: {
        Row: {
          id: string;
          report_id: string;
          organization_id: string;
          kind: AgencyKind;
          involved: boolean;
          department: string | null;
          responder_id: string | null;
          responder_name: string | null;
          case_number: string | null;
        };
        Insert: {
          id?: string;
          report_id: string;
          organization_id: string;
          kind: AgencyKind;
          involved?: boolean;
          department?: string | null;
          responder_id?: string | null;
          responder_name?: string | null;
          case_number?: string | null;
        };
        Update: {
          id?: string;
          report_id?: string;
          organization_id?: string;
          kind?: AgencyKind;
          involved?: boolean;
          department?: string | null;
          responder_id?: string | null;
          responder_name?: string | null;
          case_number?: string | null;
        };
        Relationships: [];
      };
      report_vehicles: {
        Row: {
          id: string;
          report_id: string;
          organization_id: string;
          sort_order: number;
          make_model: string | null;
          color: string | null;
          license_plate: string | null;
          driver_name: string | null;
        };
        Insert: {
          id?: string;
          report_id: string;
          organization_id: string;
          sort_order?: number;
          make_model?: string | null;
          color?: string | null;
          license_plate?: string | null;
          driver_name?: string | null;
        };
        Update: {
          id?: string;
          report_id?: string;
          organization_id?: string;
          sort_order?: number;
          make_model?: string | null;
          color?: string | null;
          license_plate?: string | null;
          driver_name?: string | null;
        };
        Relationships: [];
      };
      report_people: {
        Row: {
          id: string;
          report_id: string;
          organization_id: string;
          kind: PersonKind;
          injured_party_type: InjuredPartyType | null;
          transported_to_hospital: boolean | null;
          injury_description: string | null;
          name: string | null;
        };
        Insert: {
          id?: string;
          report_id: string;
          organization_id: string;
          kind?: PersonKind;
          injured_party_type?: InjuredPartyType | null;
          transported_to_hospital?: boolean | null;
          injury_description?: string | null;
          name?: string | null;
        };
        Update: {
          id?: string;
          report_id?: string;
          organization_id?: string;
          kind?: PersonKind;
          injured_party_type?: InjuredPartyType | null;
          transported_to_hospital?: boolean | null;
          injury_description?: string | null;
          name?: string | null;
        };
        Relationships: [];
      };
      report_property_damage: {
        Row: {
          id: string;
          report_id: string;
          organization_id: string;
          has_damage: boolean;
          damage_type: DamageType | null;
          description: string | null;
          estimated_cost: number | null;
        };
        Insert: {
          id?: string;
          report_id: string;
          organization_id: string;
          has_damage?: boolean;
          damage_type?: DamageType | null;
          description?: string | null;
          estimated_cost?: number | null;
        };
        Update: {
          id?: string;
          report_id?: string;
          organization_id?: string;
          has_damage?: boolean;
          damage_type?: DamageType | null;
          description?: string | null;
          estimated_cost?: number | null;
        };
        Relationships: [];
      };
      report_answers: {
        Row: {
          id: string;
          report_id: string;
          organization_id: string;
          question_id: string;
          value: Json | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          report_id: string;
          organization_id: string;
          question_id: string;
          value?: Json | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          report_id?: string;
          organization_id?: string;
          question_id?: string;
          value?: Json | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      report_media: {
        Row: {
          id: string;
          report_id: string;
          organization_id: string;
          kind: MediaKind;
          storage_path: string;
          content_type: string | null;
          byte_size: number | null;
          duration_seconds: number | null;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          report_id: string;
          organization_id: string;
          kind: MediaKind;
          storage_path: string;
          content_type?: string | null;
          byte_size?: number | null;
          duration_seconds?: number | null;
          created_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          report_id?: string;
          organization_id?: string;
          kind?: MediaKind;
          storage_path?: string;
          content_type?: string | null;
          byte_size?: number | null;
          duration_seconds?: number | null;
          created_by?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      report_amendments: {
        Row: {
          id: string;
          report_id: string;
          organization_id: string;
          created_by: string;
          body: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          report_id: string;
          organization_id: string;
          created_by: string;
          body: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          report_id?: string;
          organization_id?: string;
          created_by?: string;
          body?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      billing_customers: {
        Row: {
          user_id: string;
          stripe_customer_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          stripe_customer_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          stripe_customer_id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      org_billing: {
        Row: {
          organization_id: string;
          stripe_subscription_id: string | null;
          stripe_subscription_item_id: string | null;
          stripe_price_id: string | null;
          status: SubscriptionStatus;
          current_period_end: string | null;
          updated_at: string;
        };
        Insert: {
          organization_id: string;
          stripe_subscription_id?: string | null;
          stripe_subscription_item_id?: string | null;
          stripe_price_id?: string | null;
          status?: SubscriptionStatus;
          current_period_end?: string | null;
          updated_at?: string;
        };
        Update: {
          organization_id?: string;
          stripe_subscription_id?: string | null;
          stripe_subscription_item_id?: string | null;
          stripe_price_id?: string | null;
          status?: SubscriptionStatus;
          current_period_end?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      stripe_events: {
        Row: {
          id: string;
          type: string;
          processed_at: string;
        };
        Insert: {
          id: string;
          type: string;
          processed_at?: string;
        };
        Update: {
          id?: string;
          type?: string;
          processed_at?: string;
        };
        Relationships: [];
      };
      pdf_templates: {
        Row: {
          organization_id: string;
          layout: Json;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          organization_id: string;
          layout: Json;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          organization_id?: string;
          layout?: Json;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      create_organization: {
        Args: {
          org_name: string;
          building_address: string;
          building_names: string[];
          agency_name?: string | null;
        };
        Returns: Database["public"]["Tables"]["organizations"]["Row"];
      };
      request_to_join_organization: {
        Args: { code: string };
        Returns: Database["public"]["Tables"]["memberships"]["Row"];
      };
      decide_membership: {
        Args: {
          target_membership_id: string;
          new_status: MembershipStatus;
          grant_role?: MembershipRole;
        };
        Returns: Database["public"]["Tables"]["memberships"]["Row"];
      };
      set_membership_role: {
        Args: {
          target_membership_id: string;
          new_role: MembershipRole;
        };
        Returns: Database["public"]["Tables"]["memberships"]["Row"];
      };
      regenerate_join_code: {
        Args: { org_id: string };
        Returns: Database["public"]["Tables"]["organizations"]["Row"];
      };
      is_org_member: {
        Args: { org_id: string };
        Returns: boolean;
      };
      is_org_admin: {
        Args: { org_id: string };
        Returns: boolean;
      };
      is_org_owner: {
        Args: { org_id: string };
        Returns: boolean;
      };
      create_draft_report: {
        Args: { org_id: string };
        Returns: Database["public"]["Tables"]["reports"]["Row"];
      };
      submit_report: {
        Args: { target_report_id: string; signature_path: string };
        Returns: Database["public"]["Tables"]["reports"]["Row"];
      };
      discard_draft_report: {
        Args: { target_report_id: string };
        Returns: undefined;
      };
      seed_organization_intake: {
        Args: { org_id: string };
        Returns: undefined;
      };
      can_read_report: {
        Args: { target_report_id: string };
        Returns: boolean;
      };
      can_edit_draft: {
        Args: { target_report_id: string };
        Returns: boolean;
      };
      can_write_report_fields: {
        Args: { target_report_id: string };
        Returns: boolean;
      };
      finalize_report: {
        Args: { target_report_id: string; signature_path: string };
        Returns: Database["public"]["Tables"]["reports"]["Row"];
      };
      add_report_amendment: {
        Args: { target_report_id: string; amendment_body: string };
        Returns: Database["public"]["Tables"]["report_amendments"]["Row"];
      };
      delete_report: {
        Args: { target_report_id: string };
        Returns: undefined;
      };
      delete_reports: {
        Args: { target_ids: string[] };
        Returns: number;
      };
      can_admin_read_profile: {
        Args: { target_user_id: string };
        Returns: boolean;
      };
      can_read_organization: {
        Args: { org_id: string };
        Returns: boolean;
      };
      next_join_code: {
        Args: Record<string, never>;
        Returns: string;
      };
      apply_org_plan: {
        Args: { target_org_id: string; new_plan: string };
        Returns: undefined;
      };
      org_has_active_paid_subscription: {
        Args: { target_org_id: string };
        Returns: boolean;
      };
      delete_organization: {
        Args: { target_org_id: string };
        Returns: undefined;
      };
    };
    Enums: {
      membership_role: MembershipRole;
      membership_status: MembershipStatus;
      report_status: ReportStatus;
      form_section: FormSection;
      question_field_type: QuestionFieldType;
      agency_kind: AgencyKind;
      person_kind: PersonKind;
      injured_party_type: InjuredPartyType;
      damage_type: DamageType;
      media_kind: MediaKind;
      subscription_status: SubscriptionStatus;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
