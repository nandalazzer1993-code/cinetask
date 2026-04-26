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
      admin_wallets: {
        Row: {
          active: boolean
          address: string
          created_at: string
          id: string
          label: string | null
          network: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          address: string
          created_at?: string
          id?: string
          label?: string | null
          network: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          address?: string
          created_at?: string
          id?: string
          label?: string | null
          network?: string
          updated_at?: string
        }
        Relationships: []
      }
      deposits: {
        Row: {
          amount: number
          created_at: string
          id: string
          network: string | null
          note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["request_status"]
          tx_hash: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          network?: string | null
          note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          tx_hash?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          network?: string | null
          note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          tx_hash?: string | null
          user_id?: string
        }
        Relationships: []
      }
      login_events: {
        Row: {
          city: string | null
          country: string | null
          country_code: string | null
          created_at: string
          id: string
          ip: string | null
          region: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          city?: string | null
          country?: string | null
          country_code?: string | null
          created_at?: string
          id?: string
          ip?: string | null
          region?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          city?: string | null
          country?: string | null
          country_code?: string | null
          created_at?: string
          id?: string
          ip?: string | null
          region?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      lucky_orders: {
        Row: {
          claimed_at: string | null
          commission_pct: number | null
          created_at: string
          created_by: string | null
          cumulative_deposit: number
          id: string
          recharged_at: string | null
          required_recharge: number
          reward_amount: number | null
          status: string
          task_index: number
          triggered_at: string | null
          user_id: string
        }
        Insert: {
          claimed_at?: string | null
          commission_pct?: number | null
          created_at?: string
          created_by?: string | null
          cumulative_deposit?: number
          id?: string
          recharged_at?: string | null
          required_recharge: number
          reward_amount?: number | null
          status?: string
          task_index: number
          triggered_at?: string | null
          user_id: string
        }
        Update: {
          claimed_at?: string | null
          commission_pct?: number | null
          created_at?: string
          created_by?: string | null
          cumulative_deposit?: number
          id?: string
          recharged_at?: string | null
          required_recharge?: number
          reward_amount?: number | null
          status?: string
          task_index?: number
          triggered_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lucky_orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      movies: {
        Row: {
          active: boolean
          category: string
          created_at: string
          description: string | null
          id: string
          poster_url: string | null
          title: string
          trailer_url: string
        }
        Insert: {
          active?: boolean
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          poster_url?: string | null
          title: string
          trailer_url: string
        }
        Update: {
          active?: boolean
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          poster_url?: string | null
          title?: string
          trailer_url?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_type: string
          avatar_url: string | null
          balance: number
          country: string | null
          country_code: string | null
          created_at: string
          deposit_amount: number
          email: string | null
          id: string
          is_active: boolean
          is_lucky_blocked: boolean
          language: string
          last_city: string | null
          last_ip: string | null
          last_region: string | null
          last_seen: string | null
          login_count: number
          phone: string | null
          referral_code: string | null
          referred_by: string | null
          total_earned: number
          updated_at: string
          username: string | null
          vip_level: number
          withdrawal_pin_hash: string | null
        }
        Insert: {
          account_type?: string
          avatar_url?: string | null
          balance?: number
          country?: string | null
          country_code?: string | null
          created_at?: string
          deposit_amount?: number
          email?: string | null
          id: string
          is_active?: boolean
          is_lucky_blocked?: boolean
          language?: string
          last_city?: string | null
          last_ip?: string | null
          last_region?: string | null
          last_seen?: string | null
          login_count?: number
          phone?: string | null
          referral_code?: string | null
          referred_by?: string | null
          total_earned?: number
          updated_at?: string
          username?: string | null
          vip_level?: number
          withdrawal_pin_hash?: string | null
        }
        Update: {
          account_type?: string
          avatar_url?: string | null
          balance?: number
          country?: string | null
          country_code?: string | null
          created_at?: string
          deposit_amount?: number
          email?: string | null
          id?: string
          is_active?: boolean
          is_lucky_blocked?: boolean
          language?: string
          last_city?: string | null
          last_ip?: string | null
          last_region?: string | null
          last_seen?: string | null
          login_count?: number
          phone?: string | null
          referral_code?: string | null
          referred_by?: string | null
          total_earned?: number
          updated_at?: string
          username?: string | null
          vip_level?: number
          withdrawal_pin_hash?: string | null
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
      task_completions: {
        Row: {
          created_at: string
          id: string
          movie_id: string | null
          reward: number
          task_day: string
          task_index: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          movie_id?: string | null
          reward?: number
          task_day?: string
          task_index: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          movie_id?: string | null
          reward?: number
          task_day?: string
          task_index?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_completions_movie_id_fkey"
            columns: ["movie_id"]
            isOneToOne: false
            referencedRelation: "movies"
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
      wallets: {
        Row: {
          address: string
          created_at: string
          id: string
          locked: boolean
          network: string
          updated_at: string
          user_id: string
        }
        Insert: {
          address: string
          created_at?: string
          id?: string
          locked?: boolean
          network: string
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string
          created_at?: string
          id?: string
          locked?: boolean
          network?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      withdrawals: {
        Row: {
          amount: number
          created_at: string
          fee: number
          id: string
          net_amount: number
          network: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["request_status"]
          user_id: string
          wallet_address: string
        }
        Insert: {
          amount: number
          created_at?: string
          fee?: number
          id?: string
          net_amount: number
          network: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          user_id: string
          wallet_address: string
        }
        Update: {
          amount?: number
          created_at?: string
          fee?: number
          id?: string
          net_amount?: number
          network?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          user_id?: string
          wallet_address?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_reset_pin: { Args: { _user_id: string }; Returns: undefined }
      admin_reset_today_tasks: {
        Args: { _user_id: string }
        Returns: undefined
      }
      admin_reset_wallet: { Args: { _user_id: string }; Returns: undefined }
      approve_deposit: { Args: { _deposit_id: string }; Returns: undefined }
      approve_withdrawal: { Args: { _w_id: string }; Returns: undefined }
      complete_task: { Args: { _movie_id: string }; Returns: Json }
      generate_referral_code: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      record_login_event: {
        Args: {
          _city: string
          _country: string
          _country_code: string
          _ip: string
          _region: string
          _user_agent: string
        }
        Returns: undefined
      }
      reject_deposit: { Args: { _deposit_id: string }; Returns: undefined }
      reject_withdrawal: { Args: { _w_id: string }; Returns: undefined }
      request_withdrawal: { Args: { _amount: number }; Returns: string }
      set_user_country: {
        Args: { _country: string; _country_code: string }
        Returns: undefined
      }
      set_withdrawal_pin: { Args: { _pin: string }; Returns: undefined }
      touch_last_seen: { Args: never; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "user"
      request_status: "pending" | "approved" | "rejected"
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
      request_status: ["pending", "approved", "rejected"],
    },
  },
} as const
