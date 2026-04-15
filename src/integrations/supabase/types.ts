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
      demand_forecasts: {
        Row: {
          actual_qty: number | null
          adjustment_qty: number | null
          cn_code: string
          confidence: number | null
          created_at: string
          created_by: string | null
          forecast_qty: number
          id: string
          period_end: string
          period_start: string
          sku: string
          source: Database["public"]["Enums"]["forecast_source"]
          tenant: string
          updated_at: string
        }
        Insert: {
          actual_qty?: number | null
          adjustment_qty?: number | null
          cn_code: string
          confidence?: number | null
          created_at?: string
          created_by?: string | null
          forecast_qty?: number
          id?: string
          period_end: string
          period_start: string
          sku: string
          source?: Database["public"]["Enums"]["forecast_source"]
          tenant?: string
          updated_at?: string
        }
        Update: {
          actual_qty?: number | null
          adjustment_qty?: number | null
          cn_code?: string
          confidence?: number | null
          created_at?: string
          created_by?: string | null
          forecast_qty?: number
          id?: string
          period_end?: string
          period_start?: string
          sku?: string
          source?: Database["public"]["Enums"]["forecast_source"]
          tenant?: string
          updated_at?: string
        }
        Relationships: []
      }
      inventory: {
        Row: {
          batch_number: string | null
          cn_code: string
          created_at: string
          id: string
          quantity: number
          safety_stock: number
          sku: string
          tenant: string
          unit: string
          updated_at: string
          updated_by: string | null
          warehouse_code: string
        }
        Insert: {
          batch_number?: string | null
          cn_code: string
          created_at?: string
          id?: string
          quantity?: number
          safety_stock?: number
          sku: string
          tenant?: string
          unit?: string
          updated_at?: string
          updated_by?: string | null
          warehouse_code?: string
        }
        Update: {
          batch_number?: string | null
          cn_code?: string
          created_at?: string
          id?: string
          quantity?: number
          safety_stock?: number
          sku?: string
          tenant?: string
          unit?: string
          updated_at?: string
          updated_by?: string | null
          warehouse_code?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      purchase_orders: {
        Row: {
          created_at: string
          created_by: string | null
          currency: string
          expected_date: string | null
          id: string
          notes: string | null
          order_date: string
          po_number: string
          quantity: number
          received_date: string | null
          sku: string
          status: Database["public"]["Enums"]["po_status"]
          supplier: string
          tenant: string
          unit_price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          currency?: string
          expected_date?: string | null
          id?: string
          notes?: string | null
          order_date?: string
          po_number: string
          quantity?: number
          received_date?: string | null
          sku: string
          status?: Database["public"]["Enums"]["po_status"]
          supplier: string
          tenant?: string
          unit_price?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          currency?: string
          expected_date?: string | null
          id?: string
          notes?: string | null
          order_date?: string
          po_number?: string
          quantity?: number
          received_date?: string | null
          sku?: string
          status?: Database["public"]["Enums"]["po_status"]
          supplier?: string
          tenant?: string
          unit_price?: number
          updated_at?: string
        }
        Relationships: []
      }
      sop_consensus: {
        Row: {
          aop: number
          cn_code: string
          created_at: string
          fva_best: string | null
          id: string
          locked: boolean
          note: string | null
          period: string
          sku: string
          tenant: string
          updated_at: string
          v0: number
          v1: number
          v2: number
          v3: number
        }
        Insert: {
          aop?: number
          cn_code: string
          created_at?: string
          fva_best?: string | null
          id?: string
          locked?: boolean
          note?: string | null
          period?: string
          sku: string
          tenant?: string
          updated_at?: string
          v0?: number
          v1?: number
          v2?: number
          v3?: number
        }
        Update: {
          aop?: number
          cn_code?: string
          created_at?: string
          fva_best?: string | null
          id?: string
          locked?: boolean
          note?: string | null
          period?: string
          sku?: string
          tenant?: string
          updated_at?: string
          v0?: number
          v1?: number
          v2?: number
          v3?: number
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "sc_manager" | "cn_manager" | "sales" | "viewer"
      forecast_source: "system" | "manual" | "b2b"
      po_status:
        | "draft"
        | "submitted"
        | "confirmed"
        | "shipped"
        | "received"
        | "cancelled"
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
      app_role: ["admin", "sc_manager", "cn_manager", "sales", "viewer"],
      forecast_source: ["system", "manual", "b2b"],
      po_status: [
        "draft",
        "submitted",
        "confirmed",
        "shipped",
        "received",
        "cancelled",
      ],
    },
  },
} as const
