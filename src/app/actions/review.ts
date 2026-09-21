"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdminOrLead } from "@/lib/auth";

export async function saveReview(input: {
  proposalId: string;
  score: number;
  comment: string;
  actualValue: number | null;
}) {
  const profile = await requireAdminOrLead();
  const supabase = await createClient();

  const { data: existing, error: fetchError } = await supabase
    .from("proposals")
    .select("lead")
    .eq("id", input.proposalId)
    .single();
  if (fetchError || !existing) throw new Error("Proposal not found");

  const patch: {
    score: number;
    comment: string | null;
    reviewed_by: string;
    reviewed_at: string;
    actual_value?: number | null;
  } = {
    score: input.score,
    comment: input.comment.trim() || null,
    reviewed_by: profile.id,
    reviewed_at: new Date().toISOString(),
  };

  // Confirmed value only applies to an actual lead.
  if (existing.lead) {
    patch.actual_value = input.actualValue;
  }

  const { error } = await supabase.from("proposals").update(patch).eq("id", input.proposalId);
  if (error) throw new Error(error.message);

  revalidatePath("/review");
  revalidatePath("/dashboard");
  revalidatePath("/bidder");
  revalidatePath("/profile/[bidderId]", "page");
}
