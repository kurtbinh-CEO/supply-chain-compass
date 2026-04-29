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
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          actor_name: string | null
          after_data: Json | null
          before_data: Json | null
          created_at: string
          entity: string
          entity_id: string | null
          id: string
          metadata: Json
          tenant_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_name?: string | null
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          entity: string
          entity_id?: string | null
          id?: string
          metadata?: Json
          tenant_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_name?: string | null
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          entity?: string
          entity_id?: string | null
          id?: string
          metadata?: Json
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      bom: {
        Row: {
          child_sku: string
          created_at: string
          id: string
          parent_sku: string
          qty_per: number
          tenant_id: string
          unit: string
          updated_at: string
        }
        Insert: {
          child_sku: string
          created_at?: string
          id?: string
          parent_sku: string
          qty_per?: number
          tenant_id: string
          unit?: string
          updated_at?: string
        }
        Update: {
          child_sku?: string
          created_at?: string
          id?: string
          parent_sku?: string
          qty_per?: number
          tenant_id?: string
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bom_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_master: {
        Row: {
          channel: string | null
          code: string
          contact: string | null
          created_at: string
          id: string
          name: string
          region: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          channel?: string | null
          code: string
          contact?: string | null
          created_at?: string
          id?: string
          name: string
          region?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          channel?: string | null
          code?: string
          contact?: string | null
          created_at?: string
          id?: string
          name?: string
          region?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_master_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cutoff_calendar: {
        Row: {
          created_at: string
          cutoff_at: string
          cycle: string
          id: string
          kind: string
          note: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          cutoff_at: string
          cycle: string
          id?: string
          kind: string
          note?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          cutoff_at?: string
          cycle?: string
          id?: string
          kind?: string
          note?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cutoff_calendar_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
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
          tenant_id: string | null
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
          tenant_id?: string | null
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
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      drp_audit_log: {
        Row: {
          action: string
          actor_id: string | null
          actor_role: string | null
          batch_id: string
          created_at: string
          from_status: string | null
          id: string
          metadata: Json | null
          note: string | null
          tenant_id: string | null
          to_status: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_role?: string | null
          batch_id: string
          created_at?: string
          from_status?: string | null
          id?: string
          metadata?: Json | null
          note?: string | null
          tenant_id?: string | null
          to_status?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_role?: string | null
          batch_id?: string
          created_at?: string
          from_status?: string | null
          id?: string
          metadata?: Json | null
          note?: string | null
          tenant_id?: string | null
          to_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "drp_audit_log_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "drp_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      drp_exceptions: {
        Row: {
          cn_code: string
          created_at: string
          drp_run_id: string | null
          id: string
          kind: string
          message: string | null
          resolved: boolean
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          sku_code: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          cn_code: string
          created_at?: string
          drp_run_id?: string | null
          id?: string
          kind: string
          message?: string | null
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          sku_code: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          cn_code?: string
          created_at?: string
          drp_run_id?: string | null
          id?: string
          kind?: string
          message?: string | null
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          sku_code?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "drp_exceptions_drp_run_id_fkey"
            columns: ["drp_run_id"]
            isOneToOne: false
            referencedRelation: "drp_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drp_exceptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      drp_preflight_snapshots: {
        Row: {
          block_count: number
          block_reasons: string[]
          can_run: boolean
          created_at: string
          created_by: string | null
          cycle_id: string | null
          cycle_label: string | null
          cycle_status: string | null
          cycle_version: number | null
          id: string
          ok_count: number
          rows: Json
          source: string
          tenant: string
          tenant_id: string | null
          total_count: number
          warn_count: number
        }
        Insert: {
          block_count?: number
          block_reasons?: string[]
          can_run?: boolean
          created_at?: string
          created_by?: string | null
          cycle_id?: string | null
          cycle_label?: string | null
          cycle_status?: string | null
          cycle_version?: number | null
          id?: string
          ok_count?: number
          rows?: Json
          source?: string
          tenant?: string
          tenant_id?: string | null
          total_count?: number
          warn_count?: number
        }
        Update: {
          block_count?: number
          block_reasons?: string[]
          can_run?: boolean
          created_at?: string
          created_by?: string | null
          cycle_id?: string | null
          cycle_label?: string | null
          cycle_status?: string | null
          cycle_version?: number | null
          id?: string
          ok_count?: number
          rows?: Json
          source?: string
          tenant?: string
          tenant_id?: string | null
          total_count?: number
          warn_count?: number
        }
        Relationships: []
      }
      drp_runs: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          batch_code: string
          created_at: string
          created_by: string | null
          id: string
          payload: Json
          released_at: string | null
          released_by: string | null
          released_po_count: number
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          tenant: string
          tenant_id: string | null
          total_qty: number
          total_rpo: number
          total_to: number
          total_value: number
          unresolved_count: number
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          batch_code: string
          created_at?: string
          created_by?: string | null
          id?: string
          payload?: Json
          released_at?: string | null
          released_by?: string | null
          released_po_count?: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          tenant?: string
          tenant_id?: string | null
          total_qty?: number
          total_rpo?: number
          total_to?: number
          total_value?: number
          unresolved_count?: number
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          batch_code?: string
          created_at?: string
          created_by?: string | null
          id?: string
          payload?: Json
          released_at?: string | null
          released_by?: string | null
          released_po_count?: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          tenant?: string
          tenant_id?: string | null
          total_qty?: number
          total_rpo?: number
          total_to?: number
          total_value?: number
          unresolved_count?: number
          updated_at?: string
        }
        Relationships: []
      }
      fc_accuracy: {
        Row: {
          best_model: string | null
          cn_code: string
          created_at: string
          fva: string | null
          id: string
          mape_ai: number
          mape_hw: number
          stdev_ai: number
          stdev_hw: number
          tenant: string
          tenant_id: string | null
          updated_at: string
          week: string
        }
        Insert: {
          best_model?: string | null
          cn_code: string
          created_at?: string
          fva?: string | null
          id?: string
          mape_ai?: number
          mape_hw?: number
          stdev_ai?: number
          stdev_hw?: number
          tenant?: string
          tenant_id?: string | null
          updated_at?: string
          week: string
        }
        Update: {
          best_model?: string | null
          cn_code?: string
          created_at?: string
          fva?: string | null
          id?: string
          mape_ai?: number
          mape_hw?: number
          stdev_ai?: number
          stdev_hw?: number
          tenant?: string
          tenant_id?: string | null
          updated_at?: string
          week?: string
        }
        Relationships: []
      }
      gap_scenarios: {
        Row: {
          created_at: string
          created_by: string | null
          decided_at: string | null
          decided_by: string | null
          decision: string | null
          id: string
          kind: string
          payload: Json
          scenario_code: string
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          decided_at?: string | null
          decided_by?: string | null
          decision?: string | null
          id?: string
          kind: string
          payload?: Json
          scenario_code: string
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          decided_at?: string | null
          decided_by?: string | null
          decision?: string | null
          id?: string
          kind?: string
          payload?: Json
          scenario_code?: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gap_scenarios_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
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
          tenant_id: string | null
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
          tenant_id?: string | null
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
          tenant_id?: string | null
          unit?: string
          updated_at?: string
          updated_by?: string | null
          warehouse_code?: string
        }
        Relationships: []
      }
      master_branches: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          id: string
          lat: number
          lng: number
          manager: string | null
          name: string
          region: string
          tenant: string
          tenant_id: string | null
          updated_at: string
          z_factor: number
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          id?: string
          lat?: number
          lng?: number
          manager?: string | null
          name: string
          region: string
          tenant?: string
          tenant_id?: string | null
          updated_at?: string
          z_factor?: number
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          id?: string
          lat?: number
          lng?: number
          manager?: string | null
          name?: string
          region?: string
          tenant?: string
          tenant_id?: string | null
          updated_at?: string
          z_factor?: number
        }
        Relationships: []
      }
      master_containers: {
        Row: {
          capacity_m2: number
          code: string
          cost_per_km: number
          created_at: string
          created_by: string | null
          id: string
          name: string
          note: string | null
          pallet_limit: number
          tenant: string
          tenant_id: string | null
          updated_at: string
          weight_limit_kg: number
        }
        Insert: {
          capacity_m2?: number
          code: string
          cost_per_km?: number
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          note?: string | null
          pallet_limit?: number
          tenant?: string
          tenant_id?: string | null
          updated_at?: string
          weight_limit_kg?: number
        }
        Update: {
          capacity_m2?: number
          code?: string
          cost_per_km?: number
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          note?: string | null
          pallet_limit?: number
          tenant?: string
          tenant_id?: string | null
          updated_at?: string
          weight_limit_kg?: number
        }
        Relationships: []
      }
      master_data_audit: {
        Row: {
          action: string
          actor_id: string | null
          actor_name: string | null
          after_data: Json | null
          before_data: Json | null
          created_at: string
          entity: string
          entity_code: string
          id: string
          tenant: string
          tenant_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_name?: string | null
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          entity: string
          entity_code: string
          id?: string
          tenant?: string
          tenant_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_name?: string | null
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          entity?: string
          entity_code?: string
          id?: string
          tenant?: string
          tenant_id?: string | null
        }
        Relationships: []
      }
      master_factories: {
        Row: {
          capacity_m2_month: number
          code: string
          created_at: string
          created_by: string | null
          honoring_pct: number
          id: string
          lt_days: number
          moq_m2: number
          name: string
          price_tier1: number
          price_tier2: number
          region: string
          reliability: number
          sigma_lt: number
          tenant: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          capacity_m2_month?: number
          code: string
          created_at?: string
          created_by?: string | null
          honoring_pct?: number
          id?: string
          lt_days?: number
          moq_m2?: number
          name: string
          price_tier1?: number
          price_tier2?: number
          region: string
          reliability?: number
          sigma_lt?: number
          tenant?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          capacity_m2_month?: number
          code?: string
          created_at?: string
          created_by?: string | null
          honoring_pct?: number
          id?: string
          lt_days?: number
          moq_m2?: number
          name?: string
          price_tier1?: number
          price_tier2?: number
          region?: string
          reliability?: number
          sigma_lt?: number
          tenant?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      master_items: {
        Row: {
          category: string | null
          code: string
          created_at: string
          created_by: string | null
          id: string
          name: string
          nm_id: string
          tenant: string
          tenant_id: string | null
          unit: string
          unit_price: number
          updated_at: string
        }
        Insert: {
          category?: string | null
          code: string
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          nm_id: string
          tenant?: string
          tenant_id?: string | null
          unit?: string
          unit_price?: number
          updated_at?: string
        }
        Update: {
          category?: string | null
          code?: string
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          nm_id?: string
          tenant?: string
          tenant_id?: string | null
          unit?: string
          unit_price?: number
          updated_at?: string
        }
        Relationships: []
      }
      nm_performance: {
        Row: {
          created_at: string
          grade: string | null
          honoring_pct: number
          id: string
          lt_delta: string | null
          nm_code: string
          nm_name: string
          ontime_pct: number
          tenant: string
          tenant_id: string | null
          trend: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          grade?: string | null
          honoring_pct?: number
          id?: string
          lt_delta?: string | null
          nm_code: string
          nm_name: string
          ontime_pct?: number
          tenant?: string
          tenant_id?: string | null
          trend?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          grade?: string | null
          honoring_pct?: number
          id?: string
          lt_delta?: string | null
          nm_code?: string
          nm_name?: string
          ontime_pct?: number
          tenant?: string
          tenant_id?: string | null
          trend?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      order_lifecycle_events: {
        Row: {
          actor_id: string | null
          created_at: string
          event_type: string
          id: string
          order_id: string
          payload: Json
          tenant_id: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          order_id: string
          payload?: Json
          tenant_id: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          order_id?: string
          payload?: Json
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_lifecycle_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_lifecycle_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          created_by: string | null
          currency: string
          expected_at: string | null
          from_cn: string | null
          id: string
          kind: string
          order_no: string
          payload: Json
          qty: number
          sku_code: string
          status: string
          tenant_id: string
          to_cn: string | null
          updated_at: string
          value: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          currency?: string
          expected_at?: string | null
          from_cn?: string | null
          id?: string
          kind: string
          order_no: string
          payload?: Json
          qty?: number
          sku_code: string
          status?: string
          tenant_id: string
          to_cn?: string | null
          updated_at?: string
          value?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          currency?: string
          expected_at?: string | null
          from_cn?: string | null
          id?: string
          kind?: string
          order_no?: string
          payload?: Json
          qty?: number
          sku_code?: string
          status?: string
          tenant_id?: string
          to_cn?: string | null
          updated_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
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
          drp_batch_id: string | null
          expected_date: string | null
          from_cn: string | null
          id: string
          notes: string | null
          order_date: string
          po_kind: string
          po_number: string
          quantity: number
          received_date: string | null
          sku: string
          status: Database["public"]["Enums"]["po_status"]
          supplier: string
          tenant: string
          tenant_id: string | null
          to_cn: string | null
          unit_price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          currency?: string
          drp_batch_id?: string | null
          expected_date?: string | null
          from_cn?: string | null
          id?: string
          notes?: string | null
          order_date?: string
          po_kind?: string
          po_number: string
          quantity?: number
          received_date?: string | null
          sku: string
          status?: Database["public"]["Enums"]["po_status"]
          supplier: string
          tenant?: string
          tenant_id?: string | null
          to_cn?: string | null
          unit_price?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          currency?: string
          drp_batch_id?: string | null
          expected_date?: string | null
          from_cn?: string | null
          id?: string
          notes?: string | null
          order_date?: string
          po_kind?: string
          po_number?: string
          quantity?: number
          received_date?: string | null
          sku?: string
          status?: Database["public"]["Enums"]["po_status"]
          supplier?: string
          tenant?: string
          tenant_id?: string | null
          to_cn?: string | null
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_drp_batch_id_fkey"
            columns: ["drp_batch_id"]
            isOneToOne: false
            referencedRelation: "drp_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      safety_stock: {
        Row: {
          cn_code: string
          created_at: string
          effective_from: string | null
          id: string
          lead_time_days: number
          sku_code: string
          ss_qty: number
          tenant_id: string
          updated_at: string
          z_factor: number
        }
        Insert: {
          cn_code: string
          created_at?: string
          effective_from?: string | null
          id?: string
          lead_time_days?: number
          sku_code: string
          ss_qty?: number
          tenant_id: string
          updated_at?: string
          z_factor?: number
        }
        Update: {
          cn_code?: string
          created_at?: string
          effective_from?: string | null
          id?: string
          lead_time_days?: number
          sku_code?: string
          ss_qty?: number
          tenant_id?: string
          updated_at?: string
          z_factor?: number
        }
        Relationships: [
          {
            foreignKeyName: "safety_stock_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
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
          tenant_id: string | null
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
          tenant_id?: string | null
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
          tenant_id?: string | null
          updated_at?: string
          v0?: number
          v1?: number
          v2?: number
          v3?: number
        }
        Relationships: []
      }
      sop_versions: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          created_by: string | null
          id: string
          payload: Json
          period: string
          status: string
          tenant_id: string
          updated_at: string
          version_no: number
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          payload?: Json
          period: string
          status?: string
          tenant_id: string
          updated_at?: string
          version_no: number
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          payload?: Json
          period?: string
          status?: string
          tenant_id?: string
          updated_at?: string
          version_no?: number
        }
        Relationships: [
          {
            foreignKeyName: "sop_versions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          code: string
          created_at: string
          id: string
          name: string
          status: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          name: string
          status?: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          name?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      trust_scores: {
        Row: {
          cn_code: string
          components: Json
          created_at: string
          id: string
          period: string
          score: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          cn_code: string
          components?: Json
          created_at?: string
          id?: string
          period: string
          score?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          cn_code?: string
          components?: Json
          created_at?: string
          id?: string
          period?: string
          score?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trust_scores_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
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
      user_tenants: {
        Row: {
          created_at: string
          id: string
          is_default: boolean
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_tenants_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_adjustments: {
        Row: {
          cn_code: string
          created_at: string
          created_by: string | null
          delta_qty: number
          id: string
          reason: string | null
          sku_code: string
          tenant_id: string
          updated_at: string
          week: string
        }
        Insert: {
          cn_code: string
          created_at?: string
          created_by?: string | null
          delta_qty?: number
          id?: string
          reason?: string | null
          sku_code: string
          tenant_id: string
          updated_at?: string
          week: string
        }
        Update: {
          cn_code?: string
          created_at?: string
          created_by?: string | null
          delta_qty?: number
          id?: string
          reason?: string | null
          sku_code?: string
          tenant_id?: string
          updated_at?: string
          week?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_adjustments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
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
      user_has_tenant: {
        Args: { _tenant_id: string; _user_id: string }
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
