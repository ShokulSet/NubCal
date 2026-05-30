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
      food_nutrients: {
        Row: {
          amount: number
          food_id: string
          nutrient_id: string
        }
        Insert: {
          amount: number
          food_id: string
          nutrient_id: string
        }
        Update: {
          amount?: number
          food_id?: string
          nutrient_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "food_nutrients_food_id_fkey"
            columns: ["food_id"]
            isOneToOne: false
            referencedRelation: "foods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "food_nutrients_nutrient_id_fkey"
            columns: ["nutrient_id"]
            isOneToOne: false
            referencedRelation: "nutrient_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      foods: {
        Row: {
          barcode: string | null
          brand: string | null
          confidence: number | null
          created_at: string
          id: string
          name: string
          name_th: string | null
          nutrients: Json
          raw_payload: Json | null
          serving_size: number
          serving_unit: string
          servings_per_container: number | null
          source: string
          source_ref: string | null
          updated_at: string
          user_id: string
          verified: boolean
        }
        Insert: {
          barcode?: string | null
          brand?: string | null
          confidence?: number | null
          created_at?: string
          id?: string
          name: string
          name_th?: string | null
          nutrients?: Json
          raw_payload?: Json | null
          serving_size?: number
          serving_unit?: string
          servings_per_container?: number | null
          source?: string
          source_ref?: string | null
          updated_at?: string
          user_id: string
          verified?: boolean
        }
        Update: {
          barcode?: string | null
          brand?: string | null
          confidence?: number | null
          created_at?: string
          id?: string
          name?: string
          name_th?: string | null
          nutrients?: Json
          raw_payload?: Json | null
          serving_size?: number
          serving_unit?: string
          servings_per_container?: number | null
          source?: string
          source_ref?: string | null
          updated_at?: string
          user_id?: string
          verified?: boolean
        }
        Relationships: []
      }
      meal_items: {
        Row: {
          created_at: string
          food_id: string | null
          id: string
          meal_id: string
          name: string
          nutrients_snapshot: Json
          quantity: number
          serving_size: number
          serving_unit: string
          user_id: string
        }
        Insert: {
          created_at?: string
          food_id?: string | null
          id?: string
          meal_id: string
          name: string
          nutrients_snapshot?: Json
          quantity?: number
          serving_size?: number
          serving_unit?: string
          user_id: string
        }
        Update: {
          created_at?: string
          food_id?: string | null
          id?: string
          meal_id?: string
          name?: string
          nutrients_snapshot?: Json
          quantity?: number
          serving_size?: number
          serving_unit?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meal_items_food_id_fkey"
            columns: ["food_id"]
            isOneToOne: false
            referencedRelation: "foods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_items_meal_id_fkey"
            columns: ["meal_id"]
            isOneToOne: false
            referencedRelation: "meals"
            referencedColumns: ["id"]
          },
        ]
      }
      meals: {
        Row: {
          created_at: string
          eaten_at: string
          eaten_on: string
          id: string
          meal_type: string
          note: string | null
          photo_path: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          eaten_at?: string
          eaten_on: string
          id?: string
          meal_type?: string
          note?: string | null
          photo_path?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          eaten_at?: string
          eaten_on?: string
          id?: string
          meal_type?: string
          note?: string | null
          photo_path?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      nutrient_definitions: {
        Row: {
          created_at: string
          display_name: string
          id: string
          is_energy: boolean
          key: string
          kind: string
          sort_order: number
          unit: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name: string
          id?: string
          is_energy?: boolean
          key: string
          kind?: string
          sort_order?: number
          unit: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          is_energy?: boolean
          key?: string
          kind?: string
          sort_order?: number
          unit?: string
          user_id?: string
        }
        Relationships: []
      }
      nutrient_targets: {
        Row: {
          created_at: string
          day_of_week: number | null
          direction: string
          id: string
          nutrient_id: string
          target_max: number | null
          target_min: number | null
          target_value: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          day_of_week?: number | null
          direction?: string
          id?: string
          nutrient_id: string
          target_max?: number | null
          target_min?: number | null
          target_value?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          day_of_week?: number | null
          direction?: string
          id?: string
          nutrient_id?: string
          target_max?: number | null
          target_min?: number | null
          target_value?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nutrient_targets_nutrient_id_fkey"
            columns: ["nutrient_id"]
            isOneToOne: false
            referencedRelation: "nutrient_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          locale: string
          timezone: string
          unit_system: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
          locale?: string
          timezone?: string
          unit_system?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          locale?: string
          timezone?: string
          unit_system?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      daily_nutrient_totals: {
        Row: {
          eaten_on: string | null
          nutrient_key: string | null
          total: number | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
