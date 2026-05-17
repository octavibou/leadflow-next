export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      campaigns: {
        Row: {
          created_at: string
          funnel_id: string
          id: string
          is_default: boolean
          name: string
          published_at: string | null
          settings: Json
          slug: string
          steps: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          funnel_id: string
          id?: string
          is_default?: boolean
          name: string
          published_at?: string | null
          settings?: Json
          slug: string
          steps?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          funnel_id?: string
          id?: string
          is_default?: boolean
          name?: string
          published_at?: string | null
          settings?: Json
          slug?: string
          steps?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_funnel_id_fkey"
            columns: ["funnel_id"]
            isOneToOne: false
            referencedRelation: "funnels"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          branch_id: string | null
          campaign_id: string | null
          created_at: string
          deployment_id: string | null
          event_type: string
          funnel_id: string
          id: string
          metadata: Json
        }
        Insert: {
          branch_id?: string | null
          campaign_id?: string | null
          created_at?: string
          deployment_id?: string | null
          event_type: string
          funnel_id: string
          id?: string
          metadata?: Json
        }
        Update: {
          branch_id?: string | null
          campaign_id?: string | null
          created_at?: string
          deployment_id?: string | null
          event_type?: string
          funnel_id?: string
          id?: string
          metadata?: Json
        }
        Relationships: [
          {
            foreignKeyName: "events_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "funnel_branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_deployment_id_fkey"
            columns: ["deployment_id"]
            isOneToOne: false
            referencedRelation: "funnel_deployments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_funnel_id_fkey"
            columns: ["funnel_id"]
            isOneToOne: false
            referencedRelation: "funnels"
            referencedColumns: ["id"]
          },
        ]
      }
      funnels: {
        Row: {
          created_at: string
          id: string
          name: string
          saved_at: string | null
          settings: Json
          slug: string
          steps: Json
          type: string
          updated_at: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          saved_at?: string | null
          settings?: Json
          slug: string
          steps?: Json
          type: string
          updated_at?: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          saved_at?: string | null
          settings?: Json
          slug?: string
          steps?: Json
          type?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "funnels_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      funnel_secrets: {
        Row: {
          created_at: string
          funnel_id: string
          meta_access_token: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          funnel_id: string
          meta_access_token?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          funnel_id?: string
          meta_access_token?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "funnel_secrets_funnel_id_fkey"
            columns: ["funnel_id"]
            isOneToOne: true
            referencedRelation: "funnels"
            referencedColumns: ["id"]
          },
        ]
      }
      funnel_activity_events: {
        Row: {
          actor_id: string | null
          branch_id: string | null
          created_at: string
          deployment_id: string | null
          event_type: string
          funnel_id: string
          id: string
          payload: Json
        }
        Insert: {
          actor_id?: string | null
          branch_id?: string | null
          created_at?: string
          deployment_id?: string | null
          event_type: string
          funnel_id: string
          id?: string
          payload?: Json
        }
        Update: {
          actor_id?: string | null
          branch_id?: string | null
          created_at?: string
          deployment_id?: string | null
          event_type?: string
          funnel_id?: string
          id?: string
          payload?: Json
        }
        Relationships: [
          {
            foreignKeyName: "funnel_activity_events_funnel_id_fkey"
            columns: ["funnel_id"]
            isOneToOne: false
            referencedRelation: "funnels"
            referencedColumns: ["id"]
          },
        ]
      }
      funnel_branch_pointers: {
        Row: {
          active_deployment_id: string | null
          branch_id: string
          updated_at: string
        }
        Insert: {
          active_deployment_id?: string | null
          branch_id: string
          updated_at?: string
        }
        Update: {
          active_deployment_id?: string | null
          branch_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "funnel_branch_pointers_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: true
            referencedRelation: "funnel_branches"
            referencedColumns: ["id"]
          },
        ]
      }
      funnel_branches: {
        Row: {
          created_at: string
          funnel_id: string
          id: string
          is_main: boolean
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          funnel_id: string
          id?: string
          is_main?: boolean
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          funnel_id?: string
          id?: string
          is_main?: boolean
          name?: string
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "funnel_branches_funnel_id_fkey"
            columns: ["funnel_id"]
            isOneToOne: false
            referencedRelation: "funnels"
            referencedColumns: ["id"]
          },
        ]
      }
      funnel_deployments: {
        Row: {
          branch_id: string
          created_at: string
          created_by: string | null
          id: string
          landing_snapshot: Json
          settings_patch: Json
          status: string
          version: number
        }
        Insert: {
          branch_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          landing_snapshot?: Json
          settings_patch?: Json
          status?: string
          version: number
        }
        Update: {
          branch_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          landing_snapshot?: Json
          settings_patch?: Json
          status?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "funnel_deployments_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "funnel_branches"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_usage_queue: {
        Row: {
          attempts: number
          created_at: string
          id: string
          last_error: string | null
          lead_id: string
          status: string
          subscription_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          id?: string
          last_error?: string | null
          lead_id: string
          status?: string
          subscription_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          attempts?: number
          created_at?: string
          id?: string
          last_error?: string | null
          lead_id?: string
          status?: string
          subscription_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      lead_deals: {
        Row: {
          id: string
          lead_id: string | null
          funnel_id: string
          workspace_id: string
          campaign_id: string | null
          branch_id: string | null
          deployment_id: string | null
          external_provider: string
          external_deal_id: string
          external_pipeline_id: string | null
          external_stage_id: string | null
          external_stage_name: string | null
          status: string
          amount: number | null
          currency: string | null
          closed_at: string | null
          raw_payload: Json
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          lead_id?: string | null
          funnel_id: string
          workspace_id: string
          campaign_id?: string | null
          branch_id?: string | null
          deployment_id?: string | null
          external_provider: string
          external_deal_id: string
          external_pipeline_id?: string | null
          external_stage_id?: string | null
          external_stage_name?: string | null
          status?: string
          amount?: number | null
          currency?: string | null
          closed_at?: string | null
          raw_payload?: Json
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          lead_id?: string | null
          funnel_id?: string
          workspace_id?: string
          campaign_id?: string | null
          branch_id?: string | null
          deployment_id?: string | null
          external_provider?: string
          external_deal_id?: string
          external_pipeline_id?: string | null
          external_stage_id?: string | null
          external_stage_name?: string | null
          status?: string
          amount?: number | null
          currency?: string | null
          closed_at?: string | null
          raw_payload?: Json
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_deals_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_deals_funnel_id_fkey"
            columns: ["funnel_id"]
            isOneToOne: false
            referencedRelation: "funnels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_deals_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_deals_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_deals_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "funnel_branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_deals_deployment_id_fkey"
            columns: ["deployment_id"]
            isOneToOne: false
            referencedRelation: "funnel_deployments"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          answers: Json
          branch_id: string | null
          campaign_id: string | null
          created_at: string
          deployment_id: string | null
          external_id: string | null
          funnel_id: string
          id: string
          metadata: Json
          result: string | null
          revenue_amount: number | null
          revenue_currency: string | null
          stage: string | null
          stage_updated_at: string | null
        }
        Insert: {
          answers?: Json
          branch_id?: string | null
          campaign_id?: string | null
          created_at?: string
          deployment_id?: string | null
          external_id?: string | null
          funnel_id: string
          id?: string
          metadata?: Json
          result?: string | null
          revenue_amount?: number | null
          revenue_currency?: string | null
          stage?: string | null
          stage_updated_at?: string | null
        }
        Update: {
          answers?: Json
          branch_id?: string | null
          campaign_id?: string | null
          created_at?: string
          deployment_id?: string | null
          external_id?: string | null
          funnel_id?: string
          id?: string
          metadata?: Json
          result?: string | null
          revenue_amount?: number | null
          revenue_currency?: string | null
          stage?: string | null
          stage_updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "funnel_branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_deployment_id_fkey"
            columns: ["deployment_id"]
            isOneToOne: false
            referencedRelation: "funnel_deployments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_funnel_id_fkey"
            columns: ["funnel_id"]
            isOneToOne: false
            referencedRelation: "funnels"
            referencedColumns: ["id"]
          },
        ]
      }
      route_configs: {
        Row: {
          config: Json
          created_at: string
          id: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          config?: Json
          created_at?: string
          id?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          config?: Json
          created_at?: string
          id?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "route_configs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      route_invitations: {
        Row: {
          client_id: string
          client_name: string
          client_webhook_url: string
          created_at: string
          id: string
          status: string
          token: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          client_id: string
          client_name?: string
          client_webhook_url?: string
          created_at?: string
          id?: string
          status?: string
          token?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          client_id?: string
          client_name?: string
          client_webhook_url?: string
          created_at?: string
          id?: string
          status?: string
          token?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "route_invitations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          billing_interval: string
          created_at: string
          currency: string
          current_period_end: string | null
          id: string
          leads_used_current_period: number
          metered_subscription_item_id: string | null
          period_start: string | null
          plan_limits: Json
          plan_name: string
          presentment_amount: number | null
          presentment_currency: string | null
          status: string
          stripe_customer_id: string
          stripe_subscription_id: string
          subscription_items: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          billing_interval?: string
          created_at?: string
          currency?: string
          current_period_end?: string | null
          id?: string
          leads_used_current_period?: number
          metered_subscription_item_id?: string | null
          period_start?: string | null
          plan_limits?: Json
          plan_name?: string
          presentment_amount?: number | null
          presentment_currency?: string | null
          status?: string
          stripe_customer_id: string
          stripe_subscription_id: string
          subscription_items?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          billing_interval?: string
          created_at?: string
          currency?: string
          current_period_end?: string | null
          id?: string
          leads_used_current_period?: number
          metered_subscription_item_id?: string | null
          period_start?: string | null
          plan_limits?: Json
          plan_name?: string
          presentment_amount?: number | null
          presentment_currency?: string | null
          status?: string
          stripe_customer_id?: string
          stripe_subscription_id?: string
          subscription_items?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      workspace_invitations: {
        Row: {
          created_at: string
          email: string
          id: string
          invited_by: string
          role: Database["public"]["Enums"]["workspace_role"]
          status: string
          token: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          invited_by: string
          role?: Database["public"]["Enums"]["workspace_role"]
          status?: string
          token?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          invited_by?: string
          role?: Database["public"]["Enums"]["workspace_role"]
          status?: string
          token?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_invitations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_members: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["workspace_role"]
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["workspace_role"]
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["workspace_role"]
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          id: string
          logo_url: string | null
          name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      webhook_events_in: {
        Row: {
          id: string
          workspace_id: string | null
          provider: string
          event_type: string
          external_event_id: string | null
          signature: string | null
          raw_payload: Json
          processed_at: string | null
          result: string | null
          error_message: string | null
          created_at: string
        }
        Insert: {
          id?: string
          workspace_id?: string | null
          provider: string
          event_type: string
          external_event_id?: string | null
          signature?: string | null
          raw_payload: Json
          processed_at?: string | null
          result?: string | null
          error_message?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string | null
          provider?: string
          event_type?: string
          external_event_id?: string | null
          signature?: string | null
          raw_payload?: Json
          processed_at?: string | null
          result?: string | null
          error_message?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_events_in_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_integrations: {
        Row: {
          id: string
          workspace_id: string
          provider: string
          config: Json
          inbound_secret: string | null
          enabled: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          provider: string
          config?: Json
          inbound_secret?: string | null
          enabled?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          provider?: string
          config?: Json
          inbound_secret?: string | null
          enabled?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_integrations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_workspace_invitation: {
        Args: { invitation_id: string }
        Returns: undefined
      }
      peek_workspace_invitation_by_token: {
        Args: { _token: string }
        Returns: {
          workspace_name: string
          role: Database["public"]["Enums"]["workspace_role"]
        }[]
      }
      resolve_workspace_invitation_id_for_token: {
        Args: { _token: string }
        Returns: string
      }
      workspace_seat_usage_snapshot: {
        Args: { _workspace_id: string }
        Returns: Json
      }
      create_workspace_with_owner: {
        Args: { ws_name: string }
        Returns: string
      }
      get_auth_email: { Args: never; Returns: string }
      has_workspace_role: {
        Args: {
          _role: Database["public"]["Enums"]["workspace_role"]
          _user_id: string
          _workspace_id: string
        }
        Returns: boolean
      }
      is_workspace_member: {
        Args: { _user_id: string; _workspace_id: string }
        Returns: boolean
      }
      reset_leads_usage_for_subscription: {
        Args: { _period_start: string; _stripe_subscription_id: string }
        Returns: undefined
      }
    }
    Enums: {
      workspace_role: "owner" | "admin" | "editor" | "viewer"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Database

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
      workspace_role: ["owner", "admin", "editor", "viewer"],
    },
  },
} as const
