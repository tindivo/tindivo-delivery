// Tipos generados por `supabase gen types typescript --linked`.
// NO editar manualmente. Ejecutar `pnpm db:types` en la raíz del monorepo.

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
      admin_alerts: {
        Row: {
          created_at: string
          id: string
          payload: Json
          resolved_at: string | null
          resolved_by: string | null
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          payload?: Json
          resolved_at?: string | null
          resolved_by?: string | null
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          payload?: Json
          resolved_at?: string | null
          resolved_by?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_alerts_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_settlements: {
        Row: {
          confirmed_amount: number | null
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          delivered_amount: number | null
          dispute_note: string | null
          disputed_at: string | null
          driver_id: string
          id: string
          order_count: number
          reported_amount: number | null
          resolution_note: string | null
          resolved_amount: number | null
          resolved_at: string | null
          resolved_by: string | null
          restaurant_id: string
          settlement_date: string
          status: Database["public"]["Enums"]["cash_settlement_status"]
          total_cash: number
          updated_at: string
        }
        Insert: {
          confirmed_amount?: number | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          delivered_amount?: number | null
          dispute_note?: string | null
          disputed_at?: string | null
          driver_id: string
          id?: string
          order_count?: number
          reported_amount?: number | null
          resolution_note?: string | null
          resolved_amount?: number | null
          resolved_at?: string | null
          resolved_by?: string | null
          restaurant_id: string
          settlement_date: string
          status?: Database["public"]["Enums"]["cash_settlement_status"]
          total_cash?: number
          updated_at?: string
        }
        Update: {
          confirmed_amount?: number | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          delivered_amount?: number | null
          dispute_note?: string | null
          disputed_at?: string | null
          driver_id?: string
          id?: string
          order_count?: number
          reported_amount?: number | null
          resolution_note?: string | null
          resolved_amount?: number | null
          resolved_at?: string | null
          resolved_by?: string | null
          restaurant_id?: string
          settlement_date?: string
          status?: Database["public"]["Enums"]["cash_settlement_status"]
          total_cash?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_settlements_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_settlements_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_settlements_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_settlements_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      domain_events: {
        Row: {
          aggregate_id: string
          aggregate_type: string
          event_type: string
          id: string
          last_error: string | null
          metadata: Json
          occurred_at: string
          payload: Json
          published_at: string | null
          retry_count: number
          status: Database["public"]["Enums"]["domain_event_status"]
        }
        Insert: {
          aggregate_id: string
          aggregate_type: string
          event_type: string
          id?: string
          last_error?: string | null
          metadata?: Json
          occurred_at?: string
          payload?: Json
          published_at?: string | null
          retry_count?: number
          status?: Database["public"]["Enums"]["domain_event_status"]
        }
        Update: {
          aggregate_id?: string
          aggregate_type?: string
          event_type?: string
          id?: string
          last_error?: string | null
          metadata?: Json
          occurred_at?: string
          payload?: Json
          published_at?: string | null
          retry_count?: number
          status?: Database["public"]["Enums"]["domain_event_status"]
        }
        Relationships: []
      }
      driver_availability: {
        Row: {
          driver_id: string
          id: string
          is_available: boolean
          updated_at: string
        }
        Insert: {
          driver_id: string
          id?: string
          is_available?: boolean
          updated_at?: string
        }
        Update: {
          driver_id?: string
          id?: string
          is_available?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_availability_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: true
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      drivers: {
        Row: {
          created_at: string
          full_name: string
          id: string
          is_active: boolean
          license_plate: string | null
          operating_days: string[]
          phone: string
          shift_end: string
          shift_start: string
          updated_at: string
          user_id: string
          vehicle_type: Database["public"]["Enums"]["vehicle_type"]
        }
        Insert: {
          created_at?: string
          full_name: string
          id?: string
          is_active?: boolean
          license_plate?: string | null
          operating_days?: string[]
          phone: string
          shift_end?: string
          shift_start?: string
          updated_at?: string
          user_id: string
          vehicle_type?: Database["public"]["Enums"]["vehicle_type"]
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          is_active?: boolean
          license_plate?: string | null
          operating_days?: string[]
          phone?: string
          shift_end?: string
          shift_start?: string
          updated_at?: string
          user_id?: string
          vehicle_type?: Database["public"]["Enums"]["vehicle_type"]
        }
        Relationships: [
          {
            foreignKeyName: "drivers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          id: string
          notes: string | null
          order_id: string
          status: Database["public"]["Enums"]["order_status"]
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          notes?: string | null
          order_id: string
          status: Database["public"]["Enums"]["order_status"]
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          notes?: string | null
          order_id?: string
          status?: Database["public"]["Enums"]["order_status"]
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          accepted_at: string | null
          appears_in_queue_at: string
          cancel_reason: string | null
          cancel_reason_code: string | null
          cancelled_at: string | null
          cash_settlement_id: string | null
          change_to_give: number | null
          client_pays_with: number | null
          client_phone: string | null
          created_at: string
          delivered_at: string | null
          delivery_address: string | null
          delivery_coordinates: unknown
          delivery_fee: number
          delivery_maps_url: string | null
          driver_id: string | null
          estimated_ready_at: string
          extension_used: boolean
          heading_at: string | null
          id: string
          notes: string | null
          order_amount: number
          payment_status: Database["public"]["Enums"]["payment_status"]
          picked_up_at: string | null
          prep_minutes: number
          ready_early_used: boolean
          restaurant_coordinates_cache: unknown
          restaurant_id: string
          short_id: string
          status: Database["public"]["Enums"]["order_status"]
          tracking_link_sent_at: string | null
          tracking_link_sent_by: string | null
          updated_at: string
          waiting_at: string | null
        }
        Insert: {
          accepted_at?: string | null
          appears_in_queue_at: string
          cancel_reason?: string | null
          cancel_reason_code?: string | null
          cancelled_at?: string | null
          cash_settlement_id?: string | null
          change_to_give?: number | null
          client_pays_with?: number | null
          client_phone?: string | null
          created_at?: string
          delivered_at?: string | null
          delivery_address?: string | null
          delivery_coordinates?: unknown
          delivery_fee?: number
          delivery_maps_url?: string | null
          driver_id?: string | null
          estimated_ready_at: string
          extension_used?: boolean
          heading_at?: string | null
          id?: string
          notes?: string | null
          order_amount: number
          payment_status: Database["public"]["Enums"]["payment_status"]
          picked_up_at?: string | null
          prep_minutes: number
          ready_early_used?: boolean
          restaurant_coordinates_cache?: unknown
          restaurant_id: string
          short_id: string
          status?: Database["public"]["Enums"]["order_status"]
          tracking_link_sent_at?: string | null
          tracking_link_sent_by?: string | null
          updated_at?: string
          waiting_at?: string | null
        }
        Update: {
          accepted_at?: string | null
          appears_in_queue_at?: string
          cancel_reason?: string | null
          cancel_reason_code?: string | null
          cancelled_at?: string | null
          cash_settlement_id?: string | null
          change_to_give?: number | null
          client_pays_with?: number | null
          client_phone?: string | null
          created_at?: string
          delivered_at?: string | null
          delivery_address?: string | null
          delivery_coordinates?: unknown
          delivery_fee?: number
          delivery_maps_url?: string | null
          driver_id?: string | null
          estimated_ready_at?: string
          extension_used?: boolean
          heading_at?: string | null
          id?: string
          notes?: string | null
          order_amount?: number
          payment_status?: Database["public"]["Enums"]["payment_status"]
          picked_up_at?: string | null
          prep_minutes?: number
          ready_early_used?: boolean
          restaurant_coordinates_cache?: unknown
          restaurant_id?: string
          short_id?: string
          status?: Database["public"]["Enums"]["order_status"]
          tracking_link_sent_at?: string | null
          tracking_link_sent_by?: string | null
          updated_at?: string
          waiting_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_cash_settlement_id_fkey"
            columns: ["cash_settlement_id"]
            isOneToOne: false
            referencedRelation: "cash_settlements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_tracking_link_sent_by_fkey"
            columns: ["tracking_link_sent_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          consecutive_failures: number
          created_at: string
          device_label: string | null
          endpoint: string
          id: string
          last_success_at: string | null
          p256dh: string
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          consecutive_failures?: number
          created_at?: string
          device_label?: string | null
          endpoint: string
          id?: string
          last_success_at?: string | null
          p256dh: string
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          consecutive_failures?: number
          created_at?: string
          device_label?: string | null
          endpoint?: string
          id?: string
          last_success_at?: string | null
          p256dh?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurants: {
        Row: {
          accent_color: string
          address: string
          balance_due: number
          block_reason: string | null
          coordinates: unknown
          coordinates_lat: number | null
          coordinates_lng: number | null
          created_at: string
          id: string
          is_active: boolean
          is_blocked: boolean
          name: string
          phone: string
          qr_url: string | null
          updated_at: string
          user_id: string
          yape_number: string | null
        }
        Insert: {
          accent_color: string
          address: string
          balance_due?: number
          block_reason?: string | null
          coordinates?: unknown
          coordinates_lat?: number | null
          coordinates_lng?: number | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_blocked?: boolean
          name: string
          phone: string
          qr_url?: string | null
          updated_at?: string
          user_id: string
          yape_number?: string | null
        }
        Update: {
          accent_color?: string
          address?: string
          balance_due?: number
          block_reason?: string | null
          coordinates?: unknown
          coordinates_lat?: number | null
          coordinates_lng?: number | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_blocked?: boolean
          name?: string
          phone?: string
          qr_url?: string | null
          updated_at?: string
          user_id?: string
          yape_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "restaurants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      settlements: {
        Row: {
          created_at: string
          due_date: string
          id: string
          order_count: number
          paid_at: string | null
          payment_method: string | null
          payment_note: string | null
          period_end: string
          period_start: string
          restaurant_id: string
          status: Database["public"]["Enums"]["settlement_status"]
          total_amount: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          due_date: string
          id?: string
          order_count?: number
          paid_at?: string | null
          payment_method?: string | null
          payment_note?: string | null
          period_end: string
          period_start: string
          restaurant_id: string
          status?: Database["public"]["Enums"]["settlement_status"]
          total_amount?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          due_date?: string
          id?: string
          order_count?: number
          paid_at?: string | null
          payment_method?: string | null
          payment_note?: string | null
          period_end?: string
          period_start?: string
          restaurant_id?: string
          status?: Database["public"]["Enums"]["settlement_status"]
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "settlements_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string
          email: string
          id: string
          is_active: boolean
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          is_active?: boolean
          role: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_generate_settlements: {
        Args: {
          p_due_date: string
          p_period_end: string
          p_period_start: string
        }
        Returns: {
          order_count: number
          restaurant_id: string
          settlement_id: string
          total_amount: number
        }[]
      }
      admin_settlements_summary: {
        Args: never
        Returns: {
          accent_color: string
          balance_due: number
          last_paid_at: string
          overdue_amount: number
          overdue_count: number
          pending_amount: number
          pending_count: number
          qr_url: string
          restaurant_id: string
          restaurant_name: string
          yape_number: string
        }[]
      }
      current_driver_id: { Args: never; Returns: string }
      current_restaurant_id: { Args: never; Returns: string }
      current_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      custom_access_token_hook: { Args: { event: Json }; Returns: Json }
      enqueue_orders_ready_for_drivers: { Args: never; Returns: undefined }
      enqueue_overdue_orders: { Args: never; Returns: undefined }
      generate_short_id: { Args: never; Returns: string }
      get_tracking: { Args: { p_short_id: string }; Returns: Json }
    }
    Enums: {
      cash_settlement_status:
        | "pending"
        | "delivered"
        | "confirmed"
        | "disputed"
        | "resolved"
      domain_event_status: "pending" | "published" | "failed"
      order_status:
        | "waiting_driver"
        | "heading_to_restaurant"
        | "waiting_at_restaurant"
        | "picked_up"
        | "delivered"
        | "cancelled"
      payment_status: "prepaid" | "pending_yape" | "pending_cash"
      settlement_status: "pending" | "paid" | "overdue"
      user_role: "admin" | "restaurant" | "driver"
      vehicle_type: "moto" | "bicicleta" | "pie" | "auto"
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
      cash_settlement_status: [
        "pending",
        "delivered",
        "confirmed",
        "disputed",
        "resolved",
      ],
      domain_event_status: ["pending", "published", "failed"],
      order_status: [
        "waiting_driver",
        "heading_to_restaurant",
        "waiting_at_restaurant",
        "picked_up",
        "delivered",
        "cancelled",
      ],
      payment_status: ["prepaid", "pending_yape", "pending_cash"],
      settlement_status: ["pending", "paid", "overdue"],
      user_role: ["admin", "restaurant", "driver"],
      vehicle_type: ["moto", "bicicleta", "pie", "auto"],
    },
  },
} as const
