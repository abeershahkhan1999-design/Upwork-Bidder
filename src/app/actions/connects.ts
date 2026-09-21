"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";

export async function applyConnectsRefunds(input: {
  bidderId: string;
  monthKey: string;
  matches: { proposal_id: string; amount: number }[];
  unassigned: number;
  raw: string;
}) {
  const profile = await requireProfile();
  if (profile.role === "bidder" && input.bidderId !== profile.id) {
    throw new Error("Not allowed");
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("apply_connects_refunds", {
    p_bidder: input.bidderId,
    p_month: input.monthKey,
    p_matches: input.matches,
    p_unassigned: input.unassigned,
    p_raw: input.raw,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/bidder");
  revalidatePath("/dashboard");
  revalidatePath("/profile/[bidderId]", "page");
}
