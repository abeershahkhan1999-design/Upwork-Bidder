"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { RANGES } from "@/lib/business-logic";
import type { ProposalStatus } from "@/lib/database.types";

export interface ProposalInput {
  id?: string;
  bidder_id: string;
  title: string;
  url: string;
  date_sent: string;
  connects: number;
  boosted: boolean;
  boost_connects: number;
  client_budget: number;
  country: string;
  category: string;
  subcategory: string;
  status: ProposalStatus;
  lead: boolean;
  lead_value_band: string;
}

export async function saveProposal(input: ProposalInput) {
  const profile = await requireProfile();
  const isAdminOrLead = profile.role !== "bidder";

  if (!isAdminOrLead && input.bidder_id !== profile.id) {
    throw new Error("Not allowed");
  }
  // Bidders can log a new proposal but never edit one once logged.
  if (!isAdminOrLead && input.id) {
    throw new Error("Proposals can't be edited once logged");
  }

  const band = RANGES.find((r) => r.label === input.lead_value_band) ?? RANGES[1];

  const record = {
    bidder_id: input.bidder_id,
    title: input.title.trim() || "Untitled proposal",
    url: input.url.trim() || null,
    date_sent: input.date_sent,
    category: input.category,
    subcategory: input.subcategory || null,
    country: input.country,
    client_budget: Number(input.client_budget) || 0,
    connects: Number(input.connects) || 0,
    boosted: input.boosted,
    boost_connects: input.boosted ? Number(input.boost_connects) || 0 : 0,
    status: input.status,
    lead: input.lead,
    lead_value: input.lead ? band.mid : 0,
  };

  const supabase = await createClient();

  if (input.id) {
    // Turning the lead flag off clears the team lead's confirmed value too;
    // otherwise leave actual_value untouched — this modal never sets it.
    const patch = input.lead ? record : { ...record, actual_value: null };
    const { error } = await supabase.from("proposals").update(patch).eq("id", input.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("proposals").insert({ ...record, actual_value: null });
    if (error) throw new Error(error.message);
  }

  revalidatePath("/bidder");
  revalidatePath("/dashboard");
  revalidatePath("/review");
  revalidatePath("/profile/[bidderId]", "page");
}
