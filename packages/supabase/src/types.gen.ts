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
      app_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: string | null
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: string | null
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "app_settings_updated_by_fkey"
            columns: ["updated_by"]
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
      customer_order_item_modifiers: {
        Row: {
          created_at: string
          group_name: string
          id: string
          option_name: string
          order_item_id: string
          price_delta: number
        }
        Insert: {
          created_at?: string
          group_name: string
          id?: string
          option_name: string
          order_item_id: string
          price_delta?: number
        }
        Update: {
          created_at?: string
          group_name?: string
          id?: string
          option_name?: string
          order_item_id?: string
          price_delta?: number
        }
        Relationships: [
          {
            foreignKeyName: "customer_order_item_modifiers_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "customer_order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_order_items: {
        Row: {
          created_at: string
          id: string
          item_name: string
          line_total: number
          menu_item_id: string | null
          modifiers_total: number
          notes: string | null
          order_id: string
          quantity: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          item_name: string
          line_total: number
          menu_item_id?: string | null
          modifiers_total?: number
          notes?: string | null
          order_id: string
          quantity: number
          unit_price: number
        }
        Update: {
          created_at?: string
          id?: string
          item_name?: string
          line_total?: number
          menu_item_id?: string | null
          modifiers_total?: number
          notes?: string | null
          order_id?: string
          quantity?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "customer_order_items_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_profiles: {
        Row: {
          created_at: string
          default_address: string | null
          default_coordinates: unknown
          default_location_accuracy_m: number | null
          default_reference: string | null
          full_name: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          default_address?: string | null
          default_coordinates?: unknown
          default_location_accuracy_m?: number | null
          default_reference?: string | null
          full_name: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          default_address?: string | null
          default_coordinates?: unknown
          default_location_accuracy_m?: number | null
          default_reference?: string | null
          full_name?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
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
          shift_started_at: string | null
          updated_at: string
        }
        Insert: {
          driver_id: string
          id?: string
          is_available?: boolean
          shift_started_at?: string | null
          updated_at?: string
        }
        Update: {
          driver_id?: string
          id?: string
          is_available?: boolean
          shift_started_at?: string | null
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
      driver_restaurants: {
        Row: {
          created_at: string
          driver_id: string
          restaurant_id: string
        }
        Insert: {
          created_at?: string
          driver_id: string
          restaurant_id: string
        }
        Update: {
          created_at?: string
          driver_id?: string
          restaurant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_restaurants_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_restaurants_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
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
          is_test_account: boolean
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
          is_test_account?: boolean
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
          is_test_account?: boolean
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
      idempotency_keys: {
        Row: {
          created_at: string
          expires_at: string
          key: string
          request_hash: string
          response_body: Json
          response_status: number
          scope: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          key: string
          request_hash: string
          response_body: Json
          response_status: number
          scope: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          key?: string
          request_hash?: string
          response_body?: Json
          response_status?: number
          scope?: string
        }
        Relationships: []
      }
      menu_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          restaurant_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          restaurant_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          restaurant_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_categories_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_items: {
        Row: {
          category_id: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_available: boolean
          is_featured: boolean
          name: string
          prep_minutes: number | null
          price: number
          restaurant_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean
          is_featured?: boolean
          name: string
          prep_minutes?: number | null
          price: number
          restaurant_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean
          is_featured?: boolean
          name?: string
          prep_minutes?: number | null
          price?: number
          restaurant_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "menu_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_items_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_modifier_groups: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          max_selected: number
          menu_item_id: string
          min_selected: number
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          max_selected?: number
          menu_item_id: string
          min_selected?: number
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          max_selected?: number
          menu_item_id?: string
          min_selected?: number
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_modifier_groups_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_modifier_options: {
        Row: {
          created_at: string
          group_id: string
          id: string
          is_available: boolean
          name: string
          price_delta: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          is_available?: boolean
          name: string
          price_delta?: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          is_available?: boolean
          name?: string
          price_delta?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_modifier_options_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "menu_modifier_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      order_assignment_rejections: {
        Row: {
          driver_id: string
          expires_at: string
          order_id: string
          reason: string
          rejected_at: string
        }
        Insert: {
          driver_id: string
          expires_at?: string
          order_id: string
          reason: string
          rejected_at?: string
        }
        Update: {
          driver_id?: string
          expires_at?: string
          order_id?: string
          reason?: string
          rejected_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_assignment_rejections_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_assignment_rejections_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
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
      order_transfer_requests: {
        Row: {
          created_at: string
          expires_at: string
          from_driver_id: string
          id: string
          order_id: string
          resolved_at: string | null
          status: Database["public"]["Enums"]["transfer_request_status"]
          to_driver_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          from_driver_id: string
          id?: string
          order_id: string
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["transfer_request_status"]
          to_driver_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          from_driver_id?: string
          id?: string
          order_id?: string
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["transfer_request_status"]
          to_driver_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_transfer_requests_from_driver_id_fkey"
            columns: ["from_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_transfer_requests_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_transfer_requests_to_driver_id_fkey"
            columns: ["to_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          accept_countdown_seconds: number | null
          accepted_at: string | null
          appears_in_queue_at: string
          assigned_at: string | null
          cancel_reason: string | null
          cancel_reason_code: string | null
          cancelled_at: string | null
          cash_amount: number | null
          cash_settlement_id: string | null
          change_to_give: number | null
          client_name: string | null
          client_pays_with: number | null
          client_phone: string | null
          created_at: string
          customer_address: string | null
          customer_location_accuracy_m: number | null
          customer_order_subtotal: number | null
          customer_phone: string | null
          customer_user_id: string | null
          delivered_at: string | null
          delivery_address: string | null
          delivery_coordinates: unknown
          delivery_fee: number
          delivery_lat: number | null
          delivery_lng: number | null
          delivery_maps_url: string | null
          delivery_reference: string | null
          driver_id: string | null
          estimated_ready_at: string
          extension_used: boolean
          heading_at: string | null
          id: string
          notes: string | null
          occupancy_slots: number
          order_amount: number
          payment_status: Database["public"]["Enums"]["payment_status"]
          pending_acceptance_at: string | null
          picked_up_at: string | null
          prep_extended_at: string | null
          prep_extension_minutes: number | null
          prep_minutes: number
          ready_early_at: string | null
          ready_early_used: boolean
          received_at: string | null
          restaurant_accepted_at: string | null
          restaurant_accepted_prep_minutes: number | null
          restaurant_coordinates_cache: unknown
          restaurant_id: string
          short_id: string
          source: Database["public"]["Enums"]["order_source"]
          status: Database["public"]["Enums"]["order_status"]
          tracking_link_sent_at: string | null
          tracking_link_sent_by: string | null
          updated_at: string
          urgent_since: string | null
          waiting_at: string | null
          yape_amount: number | null
        }
        Insert: {
          accept_countdown_seconds?: number | null
          accepted_at?: string | null
          appears_in_queue_at: string
          assigned_at?: string | null
          cancel_reason?: string | null
          cancel_reason_code?: string | null
          cancelled_at?: string | null
          cash_amount?: number | null
          cash_settlement_id?: string | null
          change_to_give?: number | null
          client_name?: string | null
          client_pays_with?: number | null
          client_phone?: string | null
          created_at?: string
          customer_address?: string | null
          customer_location_accuracy_m?: number | null
          customer_order_subtotal?: number | null
          customer_phone?: string | null
          customer_user_id?: string | null
          delivered_at?: string | null
          delivery_address?: string | null
          delivery_coordinates?: unknown
          delivery_fee: number
          delivery_lat?: number | null
          delivery_lng?: number | null
          delivery_maps_url?: string | null
          delivery_reference?: string | null
          driver_id?: string | null
          estimated_ready_at: string
          extension_used?: boolean
          heading_at?: string | null
          id?: string
          notes?: string | null
          occupancy_slots?: number
          order_amount: number
          payment_status: Database["public"]["Enums"]["payment_status"]
          pending_acceptance_at?: string | null
          picked_up_at?: string | null
          prep_extended_at?: string | null
          prep_extension_minutes?: number | null
          prep_minutes: number
          ready_early_at?: string | null
          ready_early_used?: boolean
          received_at?: string | null
          restaurant_accepted_at?: string | null
          restaurant_accepted_prep_minutes?: number | null
          restaurant_coordinates_cache?: unknown
          restaurant_id: string
          short_id: string
          source?: Database["public"]["Enums"]["order_source"]
          status?: Database["public"]["Enums"]["order_status"]
          tracking_link_sent_at?: string | null
          tracking_link_sent_by?: string | null
          updated_at?: string
          urgent_since?: string | null
          waiting_at?: string | null
          yape_amount?: number | null
        }
        Update: {
          accept_countdown_seconds?: number | null
          accepted_at?: string | null
          appears_in_queue_at?: string
          assigned_at?: string | null
          cancel_reason?: string | null
          cancel_reason_code?: string | null
          cancelled_at?: string | null
          cash_amount?: number | null
          cash_settlement_id?: string | null
          change_to_give?: number | null
          client_name?: string | null
          client_pays_with?: number | null
          client_phone?: string | null
          created_at?: string
          customer_address?: string | null
          customer_location_accuracy_m?: number | null
          customer_order_subtotal?: number | null
          customer_phone?: string | null
          customer_user_id?: string | null
          delivered_at?: string | null
          delivery_address?: string | null
          delivery_coordinates?: unknown
          delivery_fee?: number
          delivery_lat?: number | null
          delivery_lng?: number | null
          delivery_maps_url?: string | null
          delivery_reference?: string | null
          driver_id?: string | null
          estimated_ready_at?: string
          extension_used?: boolean
          heading_at?: string | null
          id?: string
          notes?: string | null
          occupancy_slots?: number
          order_amount?: number
          payment_status?: Database["public"]["Enums"]["payment_status"]
          pending_acceptance_at?: string | null
          picked_up_at?: string | null
          prep_extended_at?: string | null
          prep_extension_minutes?: number | null
          prep_minutes?: number
          ready_early_at?: string | null
          ready_early_used?: boolean
          received_at?: string | null
          restaurant_accepted_at?: string | null
          restaurant_accepted_prep_minutes?: number | null
          restaurant_coordinates_cache?: unknown
          restaurant_id?: string
          short_id?: string
          source?: Database["public"]["Enums"]["order_source"]
          status?: Database["public"]["Enums"]["order_status"]
          tracking_link_sent_at?: string | null
          tracking_link_sent_by?: string | null
          updated_at?: string
          urgent_since?: string | null
          waiting_at?: string | null
          yape_amount?: number | null
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
            foreignKeyName: "orders_customer_user_id_fkey"
            columns: ["customer_user_id"]
            isOneToOne: false
            referencedRelation: "users"
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
      restaurant_payments: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          id: string
          paid_at: string
          payment_method: string
          payment_note: string | null
          restaurant_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          id?: string
          paid_at?: string
          payment_method: string
          payment_note?: string | null
          restaurant_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          id?: string
          paid_at?: string
          payment_method?: string
          payment_note?: string | null
          restaurant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_payments_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurants: {
        Row: {
          accent_color: string
          address: string
          balance_due: number
          commission_per_order: number
          coordinates: unknown
          coordinates_lat: number | null
          coordinates_lng: number | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          is_delivery_enabled: boolean
          is_marketplace_published: boolean
          is_test_account: boolean
          is_verified: boolean
          name: string
          phone: string
          qr_url: string | null
          qr_url_secondary: string | null
          updated_at: string
          user_id: string
          yape_number: string | null
        }
        Insert: {
          accent_color: string
          address: string
          balance_due?: number
          commission_per_order?: number
          coordinates?: unknown
          coordinates_lat?: number | null
          coordinates_lng?: number | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_delivery_enabled?: boolean
          is_marketplace_published?: boolean
          is_test_account?: boolean
          is_verified?: boolean
          name: string
          phone: string
          qr_url?: string | null
          qr_url_secondary?: string | null
          updated_at?: string
          user_id: string
          yape_number?: string | null
        }
        Update: {
          accent_color?: string
          address?: string
          balance_due?: number
          commission_per_order?: number
          coordinates?: unknown
          coordinates_lat?: number | null
          coordinates_lng?: number | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_delivery_enabled?: boolean
          is_marketplace_published?: boolean
          is_test_account?: boolean
          is_verified?: boolean
          name?: string
          phone?: string
          qr_url?: string | null
          qr_url_secondary?: string | null
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
          roles: string[]
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          is_active?: boolean
          role: Database["public"]["Enums"]["user_role"]
          roles?: string[]
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["user_role"]
          roles?: string[]
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_cancellation_reasons: {
        Args: { p_from: string; p_to: string }
        Returns: {
          avg_amount_lost: number
          cancel_reason_code: string
          count: number
        }[]
      }
      admin_demand_heatmap: {
        Args: { p_from: string; p_to: string }
        Returns: {
          cancelled: number
          delivered: number
          dow: number
          hour: number
          orders: number
        }[]
      }
      admin_drivers_performance: {
        Args: { p_from: string; p_to: string }
        Returns: {
          avg_delivery_minutes: number
          avg_pickup_to_deliver_minutes: number
          cancelled: number
          cash_collected: number
          commission_generated: number
          delivered: number
          driver_id: string
          full_name: string
          gmv_delivered: number
          is_active: boolean
          rejections_count: number
          total_assigned: number
          vehicle_type: string
        }[]
      }
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
      admin_operations_funnel: {
        Args: { p_from: string; p_to: string }
        Returns: {
          avg_min_in_route_to_restaurant: number
          avg_min_pickup_to_deliver: number
          avg_min_to_accept: number
          avg_min_to_assign: number
          avg_min_total: number
          avg_min_wait_at_restaurant: number
          on_time_count: number
          on_time_pct: number
          p50_min_total: number
          p90_min_total: number
          p95_min_total: number
          total_delivered: number
        }[]
      }
      admin_restaurants_performance: {
        Args: { p_from: string; p_to: string }
        Returns: {
          accent_color: string
          aov: number
          avg_prep_minutes: number
          balance_due: number
          cancelled: number
          commission: number
          commission_per_order: number
          delivered: number
          gmv: number
          name: string
          repeat_phones: number
          restaurant_id: string
          total: number
          unique_phones: number
        }[]
      }
      admin_sales_timeseries: {
        Args: { p_from: string; p_to: string }
        Returns: {
          aov: number
          cancelled: number
          cash_orders: number
          commission: number
          day: string
          delivered: number
          gmv: number
          marketplace_orders: number
          mixed_orders: number
          orders: number
          prepaid_orders: number
          restaurant_orders: number
          yape_orders: number
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
      auto_cancel_unaccepted_orders: { Args: never; Returns: undefined }
      auto_close_drivers_on_schedule_end: { Args: never; Returns: undefined }
      claim_idempotency_key: {
        Args: { p_key: string; p_request_hash: string; p_scope: string }
        Returns: {
          cached_body: Json
          cached_status: number
          outcome: string
        }[]
      }
      claim_pending_orders: {
        Args: { p_limit?: number }
        Returns: {
          id: string
        }[]
      }
      current_customer_user_id: { Args: never; Returns: string }
      current_driver_id: { Args: never; Returns: string }
      current_restaurant_id: { Args: never; Returns: string }
      current_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      current_user_roles: { Args: never; Returns: string[] }
      custom_access_token_hook: { Args: { event: Json }; Returns: Json }
      enqueue_orders_ready_for_drivers: { Args: never; Returns: undefined }
      enqueue_overdue_orders: { Args: never; Returns: undefined }
      expire_pending_transfer_requests: { Args: never; Returns: undefined }
      finalize_idempotency_key: {
        Args: {
          p_key: string
          p_response_body: Json
          p_response_status: number
          p_scope: string
        }
        Returns: undefined
      }
      generate_short_id: { Args: never; Returns: string }
      get_tracking: { Args: { p_short_id: string }; Returns: Json }
      invoke_assign_one: { Args: { p_order_id: string }; Returns: undefined }
      invoke_assign_pending_orders: { Args: never; Returns: undefined }
      invoke_process_expired_transfer_requests: {
        Args: never
        Returns: undefined
      }
      list_available_for_driver: {
        Args: { p_driver_id: string }
        Returns: {
          accept_countdown_seconds: number | null
          accepted_at: string | null
          appears_in_queue_at: string
          assigned_at: string | null
          cancel_reason: string | null
          cancel_reason_code: string | null
          cancelled_at: string | null
          cash_amount: number | null
          cash_settlement_id: string | null
          change_to_give: number | null
          client_name: string | null
          client_pays_with: number | null
          client_phone: string | null
          created_at: string
          customer_address: string | null
          customer_location_accuracy_m: number | null
          customer_order_subtotal: number | null
          customer_phone: string | null
          customer_user_id: string | null
          delivered_at: string | null
          delivery_address: string | null
          delivery_coordinates: unknown
          delivery_fee: number
          delivery_lat: number | null
          delivery_lng: number | null
          delivery_maps_url: string | null
          delivery_reference: string | null
          driver_id: string | null
          estimated_ready_at: string
          extension_used: boolean
          heading_at: string | null
          id: string
          notes: string | null
          occupancy_slots: number
          order_amount: number
          payment_status: Database["public"]["Enums"]["payment_status"]
          pending_acceptance_at: string | null
          picked_up_at: string | null
          prep_extended_at: string | null
          prep_extension_minutes: number | null
          prep_minutes: number
          ready_early_at: string | null
          ready_early_used: boolean
          received_at: string | null
          restaurant_accepted_at: string | null
          restaurant_accepted_prep_minutes: number | null
          restaurant_coordinates_cache: unknown
          restaurant_id: string
          short_id: string
          source: Database["public"]["Enums"]["order_source"]
          status: Database["public"]["Enums"]["order_status"]
          tracking_link_sent_at: string | null
          tracking_link_sent_by: string | null
          updated_at: string
          urgent_since: string | null
          waiting_at: string | null
          yape_amount: number | null
        }[]
        SetofOptions: {
          from: "*"
          to: "orders"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      list_team_orders: {
        Args: { p_driver_id: string }
        Returns: {
          accept_countdown_seconds: number | null
          accepted_at: string | null
          appears_in_queue_at: string
          assigned_at: string | null
          cancel_reason: string | null
          cancel_reason_code: string | null
          cancelled_at: string | null
          cash_amount: number | null
          cash_settlement_id: string | null
          change_to_give: number | null
          client_name: string | null
          client_pays_with: number | null
          client_phone: string | null
          created_at: string
          customer_address: string | null
          customer_location_accuracy_m: number | null
          customer_order_subtotal: number | null
          customer_phone: string | null
          customer_user_id: string | null
          delivered_at: string | null
          delivery_address: string | null
          delivery_coordinates: unknown
          delivery_fee: number
          delivery_lat: number | null
          delivery_lng: number | null
          delivery_maps_url: string | null
          delivery_reference: string | null
          driver_id: string | null
          estimated_ready_at: string
          extension_used: boolean
          heading_at: string | null
          id: string
          notes: string | null
          occupancy_slots: number
          order_amount: number
          payment_status: Database["public"]["Enums"]["payment_status"]
          pending_acceptance_at: string | null
          picked_up_at: string | null
          prep_extended_at: string | null
          prep_extension_minutes: number | null
          prep_minutes: number
          ready_early_at: string | null
          ready_early_used: boolean
          received_at: string | null
          restaurant_accepted_at: string | null
          restaurant_accepted_prep_minutes: number | null
          restaurant_coordinates_cache: unknown
          restaurant_id: string
          short_id: string
          source: Database["public"]["Enums"]["order_source"]
          status: Database["public"]["Enums"]["order_status"]
          tracking_link_sent_at: string | null
          tracking_link_sent_by: string | null
          updated_at: string
          urgent_since: string | null
          waiting_at: string | null
          yape_amount: number | null
        }[]
        SetofOptions: {
          from: "*"
          to: "orders"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      prune_expired_idempotency_keys: { Args: never; Returns: undefined }
      prune_expired_rejections: { Args: never; Returns: undefined }
      prune_stale_push_subscriptions: { Args: never; Returns: undefined }
      release_idempotency_key: {
        Args: { p_key: string; p_scope: string }
        Returns: undefined
      }
      timeout_unaccepted_assignments: { Args: never; Returns: undefined }
      user_is_driver_of_restaurant: {
        Args: { p_restaurant_id: string }
        Returns: boolean
      }
      user_is_restaurant_of_driver: {
        Args: { p_driver_id: string }
        Returns: boolean
      }
    }
    Enums: {
      cash_settlement_status:
        | "pending"
        | "delivered"
        | "confirmed"
        | "disputed"
        | "resolved"
      domain_event_status: "pending" | "published" | "failed"
      order_source: "restaurant_pwa" | "customer_pwa"
      order_status:
        | "pending_acceptance"
        | "waiting_driver"
        | "heading_to_restaurant"
        | "waiting_at_restaurant"
        | "picked_up"
        | "delivered"
        | "cancelled"
      payment_status:
        | "prepaid"
        | "pending_yape"
        | "pending_cash"
        | "pending_mixed"
      settlement_status: "pending" | "paid" | "overdue"
      transfer_request_status: "pending" | "accepted" | "rejected" | "expired"
      user_role: "admin" | "restaurant" | "driver" | "customer" | "business"
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
      order_source: ["restaurant_pwa", "customer_pwa"],
      order_status: [
        "pending_acceptance",
        "waiting_driver",
        "heading_to_restaurant",
        "waiting_at_restaurant",
        "picked_up",
        "delivered",
        "cancelled",
      ],
      payment_status: [
        "prepaid",
        "pending_yape",
        "pending_cash",
        "pending_mixed",
      ],
      settlement_status: ["pending", "paid", "overdue"],
      transfer_request_status: ["pending", "accepted", "rejected", "expired"],
      user_role: ["admin", "restaurant", "driver", "customer", "business"],
      vehicle_type: ["moto", "bicicleta", "pie", "auto"],
    },
  },
} as const
