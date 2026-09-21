"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdminOrLead } from "@/lib/auth";

export interface TargetFormRow {
  bidder_id: string;
  leads_target: number;
  connects_cap: number;
  revenue_target: number;
}

export async function saveTargets(input: {
  scope: "month" | "default";
  monthKey: string;
  rows: TargetFormRow[];
}) {
  const profile = await requireAdminOrLead();
  const supabase = await createClient();
  const month = input.scope === "default" ? "default" : input.monthKey;

  const upserts = input.rows.map((r) => ({
    month,
    bidder_id: r.bidder_id,
    leads_target: Math.max(0, Number(r.leads_target) || 0),
    connects_cap: Math.max(0, Number(r.connects_cap) || 0),
    revenue_target: Math.max(0, Number(r.revenue_target) || 0),
    updated_by: profile.id,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase.from("targets").upsert(upserts, { onConflict: "month,bidder_id" });
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard");
  revalidatePath("/bidder");
  revalidatePath("/profile/[bidderId]", "page");
}

// "Clear this month's override" — deletes only the month row, never the default.
export async function clearTargetOverride(monthKey: string, bidderIds: string[]) {
  await requireAdminOrLead();
  const supabase = await createClient();
  const { error } = await supabase
    .from("targets")
    .delete()
    .eq("month", monthKey)
    .in("bidder_id", bidderIds);
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard");
  revalidatePath("/bidder");
  revalidatePath("/profile/[bidderId]", "page");
}
