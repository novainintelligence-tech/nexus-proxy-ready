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
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          price_cents: number
          proxy_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          price_cents: number
          proxy_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          price_cents?: number
          proxy_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_proxy_id_fkey"
            columns: ["proxy_id"]
            isOneToOne: false
            referencedRelation: "proxies"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_cents: number
          confirmed_at: string | null
          created_at: string
          currency: string
          id: string
          metadata: Json
          pay_address: string | null
          pay_amount: number | null
          provider: string
          provider_invoice_id: string | null
          provider_payment_id: string | null
          status: string
          tx_hash: string | null
          user_id: string
        }
        Insert: {
          amount_cents: number
          confirmed_at?: string | null
          created_at?: string
          currency?: string
          id?: string
          metadata?: Json
          pay_address?: string | null
          pay_amount?: number | null
          provider?: string
          provider_invoice_id?: string | null
          provider_payment_id?: string | null
          status?: string
          tx_hash?: string | null
          user_id: string
        }
        Update: {
          amount_cents?: number
          confirmed_at?: string | null
          created_at?: string
          currency?: string
          id?: string
          metadata?: Json
          pay_address?: string | null
          pay_amount?: number | null
          provider?: string
          provider_invoice_id?: string | null
          provider_payment_id?: string | null
          status?: string
          tx_hash?: string | null
          user_id?: string
        }
        Relationships: []
      }
      plans: {
        Row: {
          active: boolean
          bandwidth_gb: number | null
          created_at: string
          description: string | null
          duration_days: number
          id: string
          max_proxies: number
          name: string
          price_cents: number
          proxy_type: string
          sort_order: number
        }
        Insert: {
          active?: boolean
          bandwidth_gb?: number | null
          created_at?: string
          description?: string | null
          duration_days: number
          id?: string
          max_proxies?: number
          name: string
          price_cents: number
          proxy_type?: string
          sort_order?: number
        }
        Update: {
          active?: boolean
          bandwidth_gb?: number | null
          created_at?: string
          description?: string | null
          duration_days?: number
          id?: string
          max_proxies?: number
          name?: string
          price_cents?: number
          proxy_type?: string
          sort_order?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          balance_cents: number
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          referral_code: string
          referred_by: string | null
          updated_at: string
        }
        Insert: {
          balance_cents?: number
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
          referral_code?: string
          referred_by?: string | null
          updated_at?: string
        }
        Update: {
          balance_cents?: number
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          referral_code?: string
          referred_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      proxies: {
        Row: {
          assigned_to: string | null
          auth_type: string
          blacklist: boolean
          city: string | null
          country: string | null
          created_at: string
          external_id: string | null
          host: string | null
          id: string
          ip: unknown
          last_seen_at: string | null
          last_view_at: string | null
          password: string
          port: number
          protocol: string
          proxy_type: string
          region: string | null
          source: string | null
          speed_mbps: number | null
          status: string
          username: string
          zipcode: string | null
        }
        Insert: {
          assigned_to?: string | null
          auth_type?: string
          blacklist?: boolean
          city?: string | null
          country?: string | null
          created_at?: string
          external_id?: string | null
          host?: string | null
          id?: string
          ip: unknown
          last_seen_at?: string | null
          last_view_at?: string | null
          password: string
          port: number
          protocol?: string
          proxy_type?: string
          region?: string | null
          source?: string | null
          speed_mbps?: number | null
          status?: string
          username: string
          zipcode?: string | null
        }
        Update: {
          assigned_to?: string | null
          auth_type?: string
          blacklist?: boolean
          city?: string | null
          country?: string | null
          created_at?: string
          external_id?: string | null
          host?: string | null
          id?: string
          ip?: unknown
          last_seen_at?: string | null
          last_view_at?: string | null
          password?: string
          port?: number
          protocol?: string
          proxy_type?: string
          region?: string | null
          source?: string | null
          speed_mbps?: number | null
          status?: string
          username?: string
          zipcode?: string | null
        }
        Relationships: []
      }
      referrals: {
        Row: {
          commission_cents: number
          created_at: string
          id: string
          referred_id: string
          referrer_id: string
          status: string
        }
        Insert: {
          commission_cents?: number
          created_at?: string
          id?: string
          referred_id: string
          referrer_id: string
          status?: string
        }
        Update: {
          commission_cents?: number
          created_at?: string
          id?: string
          referred_id?: string
          referrer_id?: string
          status?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          bandwidth_limit_mb: number | null
          bandwidth_used_mb: number
          created_at: string
          expires_at: string | null
          id: string
          plan_id: string | null
          starts_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          bandwidth_limit_mb?: number | null
          bandwidth_used_mb?: number
          created_at?: string
          expires_at?: string | null
          id?: string
          plan_id?: string | null
          starts_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          bandwidth_limit_mb?: number | null
          bandwidth_used_mb?: number
          created_at?: string
          expires_at?: string | null
          id?: string
          plan_id?: string | null
          starts_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_logs: {
        Row: {
          bytes_used: number
          id: string
          proxy_id: string | null
          recorded_at: string
          request_count: number
          user_id: string
        }
        Insert: {
          bytes_used?: number
          id?: string
          proxy_id?: string | null
          recorded_at?: string
          request_count?: number
          user_id: string
        }
        Update: {
          bytes_used?: number
          id?: string
          proxy_id?: string | null
          recorded_at?: string
          request_count?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usage_logs_proxy_id_fkey"
            columns: ["proxy_id"]
            isOneToOne: false
            referencedRelation: "proxies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
