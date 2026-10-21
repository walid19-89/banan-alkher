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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      fund_audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          actor_name: string | null
          created_at: string
          details: string | null
          entity_id: string | null
          entity_type: string
          id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_name?: string | null
          created_at?: string
          details?: string | null
          entity_id?: string | null
          entity_type: string
          id?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_name?: string | null
          created_at?: string
          details?: string | null
          entity_id?: string | null
          entity_type?: string
          id?: string
        }
        Relationships: []
      }
      fund_expense_approvals: {
        Row: {
          approver_id: string
          approver_name: string
          approver_role: string
          created_at: string
          decision: string
          id: string
          notes: string | null
          request_id: string
        }
        Insert: {
          approver_id: string
          approver_name: string
          approver_role: string
          created_at?: string
          decision: string
          id?: string
          notes?: string | null
          request_id: string
        }
        Update: {
          approver_id?: string
          approver_name?: string
          approver_role?: string
          created_at?: string
          decision?: string
          id?: string
          notes?: string | null
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fund_expense_approvals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "fund_expense_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      fund_expense_requests: {
        Row: {
          amount: number
          approval_count: number
          attachment_url: string | null
          beneficiary_name: string
          beneficiary_phone: string | null
          category: string
          created_at: string
          created_by: string | null
          description: string
          disbursed_at: string | null
          disbursed_by: string | null
          id: string
          notes: string | null
          payment_voucher_no: string | null
          request_no: number
          requested_date: string
          status: string
        }
        Insert: {
          amount: number
          approval_count?: number
          attachment_url?: string | null
          beneficiary_name: string
          beneficiary_phone?: string | null
          category: string
          created_at?: string
          created_by?: string | null
          description: string
          disbursed_at?: string | null
          disbursed_by?: string | null
          id?: string
          notes?: string | null
          payment_voucher_no?: string | null
          request_no?: never
          requested_date?: string
          status?: string
        }
        Update: {
          amount?: number
          approval_count?: number
          attachment_url?: string | null
          beneficiary_name?: string
          beneficiary_phone?: string | null
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string
          disbursed_at?: string | null
          disbursed_by?: string | null
          id?: string
          notes?: string | null
          payment_voucher_no?: string | null
          request_no?: never
          requested_date?: string
          status?: string
        }
        Relationships: []
      }
      fund_members: {
        Row: {
          active: boolean
          address: string | null
          created_at: string
          full_name: string
          id: string
          joined_on: string
          member_no: string | null
          monthly_fee: number
          notes: string | null
          phone: string | null
        }
        Insert: {
          active?: boolean
          address?: string | null
          created_at?: string
          full_name: string
          id?: string
          joined_on?: string
          member_no?: string | null
          monthly_fee?: number
          notes?: string | null
          phone?: string | null
        }
        Update: {
          active?: boolean
          address?: string | null
          created_at?: string
          full_name?: string
          id?: string
          joined_on?: string
          member_no?: string | null
          monthly_fee?: number
          notes?: string | null
          phone?: string | null
        }
        Relationships: []
      }
      fund_receipts: {
        Row: {
          amount: number
          attachment_url: string | null
          created_at: string
          created_by: string | null
          donor_name: string | null
          id: string
          is_restricted: boolean
          member_id: string | null
          notes: string | null
          payment_method: string
          receipt_date: string
          receipt_no: number
          receipt_type: string
          restricted_purpose: string | null
          subscription_id: string | null
        }
        Insert: {
          amount: number
          attachment_url?: string | null
          created_at?: string
          created_by?: string | null
          donor_name?: string | null
          id?: string
          is_restricted?: boolean
          member_id?: string | null
          notes?: string | null
          payment_method?: string
          receipt_date?: string
          receipt_no?: never
          receipt_type: string
          restricted_purpose?: string | null
          subscription_id?: string | null
        }
        Update: {
          amount?: number
          attachment_url?: string | null
          created_at?: string
          created_by?: string | null
          donor_name?: string | null
          id?: string
          is_restricted?: boolean
          member_id?: string | null
          notes?: string | null
          payment_method?: string
          receipt_date?: string
          receipt_no?: never
          receipt_type?: string
          restricted_purpose?: string | null
          subscription_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fund_receipts_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "fund_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fund_receipts_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "fund_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      fund_settings: {
        Row: {
          allow_self_approval: boolean
          currency: string
          default_monthly_fee: number
          fund_name: string
          id: string
          logo_url: string | null
          opening_balance: number
          updated_at: string
        }
        Insert: {
          allow_self_approval?: boolean
          currency?: string
          default_monthly_fee?: number
          fund_name?: string
          id?: string
          logo_url?: string | null
          opening_balance?: number
          updated_at?: string
        }
        Update: {
          allow_self_approval?: boolean
          currency?: string
          default_monthly_fee?: number
          fund_name?: string
          id?: string
          logo_url?: string | null
          opening_balance?: number
          updated_at?: string
        }
        Relationships: []
      }
      fund_subscriptions: {
        Row: {
          amount: number
          created_at: string
          due_month: string
          id: string
          member_id: string
          paid_amount: number
          status: string
        }
        Insert: {
          amount?: number
          created_at?: string
          due_month: string
          id?: string
          member_id: string
          paid_amount?: number
          status?: string
        }
        Update: {
          amount?: number
          created_at?: string
          due_month?: string
          id?: string
          member_id?: string
          paid_amount?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "fund_subscriptions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "fund_members"
            referencedColumns: ["id"]
          },
        ]
      }
      fund_user_profiles: {
        Row: {
          active: boolean
          created_at: string
          email: string | null
          full_name: string
          linked_member_id: string | null
          phone: string | null
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          email?: string | null
          full_name: string
          linked_member_id?: string | null
          phone?: string | null
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          email?: string | null
          full_name?: string
          linked_member_id?: string | null
          phone?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fund_user_profiles_member_fk"
            columns: ["linked_member_id"]
            isOneToOne: false
            referencedRelation: "fund_members"
            referencedColumns: ["id"]
          },
        ]
      }
      fund_user_roles: {
        Row: {
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      fund_cash_balance: { Args: never; Returns: number }
      fund_decide_expense: {
        Args: { p_decision: string; p_notes?: string; p_request_id: string }
        Returns: Json
      }
      fund_disburse_expense: { Args: { p_request_id: string }; Returns: Json }
      fund_generate_monthly_dues: { Args: { p_month: string }; Returns: number }
      fund_has_role: {
        Args: { _roles: string[]; _uid: string }
        Returns: boolean
      }
      fund_is_staff: { Args: { _uid: string }; Returns: boolean }
      fund_log: {
        Args: {
          _action: string
          _details: string
          _entity: string
          _entity_id: string
        }
        Returns: undefined
      }
      fund_pay_subscription: {
        Args: {
          p_amount: number
          p_date?: string
          p_method?: string
          p_notes?: string
          p_subscription_id: string
        }
        Returns: string
      }
      fund_public_branding: { Args: never; Returns: Json }
      fund_role: { Args: { _uid: string }; Returns: string }
      fund_summary: { Args: never; Returns: Json }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
