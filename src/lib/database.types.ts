// Hand-written to match supabase/schema.sql. Regenerate with
// `supabase gen types typescript` once the project is live if the schema drifts.

export type UserRole = "super_admin" | "team_lead" | "bidder";
export type ProposalStatus =
  | "no_reply"
  | "viewed"
  | "replied"
  | "interview"
  | "hired";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          initials: string;
          role: UserRole;
          active: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name: string;
          initials: string;
          role: UserRole;
          active?: boolean;
          created_at?: string;
        };
        Update: Partial<{
          id: string;
          email: string;
          full_name: string;
          initials: string;
          role: UserRole;
          active: boolean;
          created_at: string;
        }>;
        Relationships: [];
      };
      proposals: {
        Row: {
          id: string;
          bidder_id: string;
          title: string;
          url: string | null;
          date_sent: string;
          month: string;
          category: string;
          subcategory: string | null;
          country: string;
          client_budget: number;
          connects: number;
          boosted: boolean;
          boost_connects: number;
          refunded_connects: number;
          status: ProposalStatus;
          lead: boolean;
          lead_value: number;
          actual_value: number | null;
          score: number | null;
          comment: string | null;
          reviewed_by: string | null;
          reviewed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          bidder_id: string;
          title: string;
          url?: string | null;
          date_sent: string;
          category: string;
          subcategory?: string | null;
          country: string;
          client_budget?: number;
          connects?: number;
          boosted?: boolean;
          boost_connects?: number;
          refunded_connects?: number;
          status?: ProposalStatus;
          lead?: boolean;
          lead_value?: number;
          actual_value?: number | null;
          score?: number | null;
          comment?: string | null;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<{
          id: string;
          bidder_id: string;
          title: string;
          url: string | null;
          date_sent: string;
          category: string;
          subcategory: string | null;
          country: string;
          client_budget: number;
          connects: number;
          boosted: boolean;
          boost_connects: number;
          refunded_connects: number;
          status: ProposalStatus;
          lead: boolean;
          lead_value: number;
          actual_value: number | null;
          score: number | null;
          comment: string | null;
          reviewed_by: string | null;
          reviewed_at: string | null;
          created_at: string;
          updated_at: string;
        }>;
        Relationships: [];
      };
      refund_pool: {
        Row: {
          month: string;
          bidder_id: string;
          connects: number;
        };
        Insert: {
          month: string;
          bidder_id: string;
          connects?: number;
        };
        Update: Partial<{ month: string; bidder_id: string; connects: number }>;
        Relationships: [];
      };
      targets: {
        Row: {
          month: string;
          bidder_id: string;
          leads_target: number;
          connects_cap: number;
          revenue_target: number;
          updated_by: string | null;
          updated_at: string;
        };
        Insert: {
          month: string;
          bidder_id: string;
          leads_target: number;
          connects_cap: number;
          revenue_target: number;
          updated_by?: string | null;
          updated_at?: string;
        };
        Update: Partial<{
          month: string;
          bidder_id: string;
          leads_target: number;
          connects_cap: number;
          revenue_target: number;
          updated_by: string | null;
          updated_at: string;
        }>;
        Relationships: [];
      };
      connects_imports: {
        Row: {
          id: string;
          bidder_id: string;
          month: string;
          raw_text: string;
          applied: { matches: { proposal_id: string; amount: number }[]; unassigned: number };
          created_at: string;
          created_by: string;
        };
        Insert: {
          id?: string;
          bidder_id: string;
          month: string;
          raw_text: string;
          applied: { matches: { proposal_id: string; amount: number }[]; unassigned: number };
          created_at?: string;
          created_by: string;
        };
        Update: Partial<{
          id: string;
          bidder_id: string;
          month: string;
          raw_text: string;
          applied: { matches: { proposal_id: string; amount: number }[]; unassigned: number };
          created_at: string;
          created_by: string;
        }>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      apply_connects_refunds: {
        Args: {
          p_bidder: string;
          p_month: string;
          p_matches: { proposal_id: string; amount: number }[];
          p_unassigned: number;
          p_raw: string;
        };
        Returns: undefined;
      };
      current_role_of: {
        Args: Record<string, never>;
        Returns: UserRole;
      };
    };
    Enums: {
      user_role: UserRole;
      proposal_status: ProposalStatus;
    };
    CompositeTypes: Record<string, never>;
  };
}
