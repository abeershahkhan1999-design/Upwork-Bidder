import { createClient } from "@/lib/supabase/server";
import type { Proposal } from "@/lib/business-logic";
import type { UserRole } from "@/lib/database.types";

export interface BidderProfile {
  id: string;
  full_name: string;
  initials: string;
  role: UserRole;
  active: boolean;
}

export async function getBidders(): Promise<BidderProfile[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, initials, role, active")
    .eq("role", "bidder")
    .eq("active", true)
    .order("full_name");
  return data ?? [];
}

export async function getAllProfiles(): Promise<BidderProfile[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, initials, role, active")
    .order("full_name");
  return data ?? [];
}

export async function getProposalsForMonth(monthKey: string, bidderId?: string): Promise<Proposal[]> {
  const supabase = await createClient();
  let q = supabase.from("proposals").select("*").eq("month", monthKey);
  if (bidderId) q = q.eq("bidder_id", bidderId);
  const { data } = await q.order("date_sent", { ascending: false });
  return (data ?? []) as Proposal[];
}

export async function getProposalsForBidderMonths(bidderId: string, monthKeys: string[]): Promise<Proposal[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("proposals")
    .select("*")
    .eq("bidder_id", bidderId)
    .in("month", monthKeys)
    .order("date_sent", { ascending: false });
  return (data ?? []) as Proposal[];
}

export async function getProposalById(id: string): Promise<Proposal | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("proposals").select("*").eq("id", id).maybeSingle();
  return data as Proposal | null;
}

export interface RefundPoolRow {
  month: string;
  bidder_id: string;
  connects: number;
}

export async function getRefundPool(monthKey: string, bidderId?: string): Promise<RefundPoolRow[]> {
  const supabase = await createClient();
  let q = supabase.from("refund_pool").select("*").eq("month", monthKey);
  if (bidderId) q = q.eq("bidder_id", bidderId);
  const { data } = await q;
  return data ?? [];
}

export interface TargetDbRow {
  month: string;
  bidder_id: string;
  leads_target: number;
  connects_cap: number;
  revenue_target: number;
}

export async function getTargets(bidderId?: string): Promise<TargetDbRow[]> {
  const supabase = await createClient();
  let q = supabase.from("targets").select("month, bidder_id, leads_target, connects_cap, revenue_target");
  if (bidderId) q = q.eq("bidder_id", bidderId);
  const { data } = await q;
  return data ?? [];
}
