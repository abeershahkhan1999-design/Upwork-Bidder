import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { buildCsv, resolveMonthParam, type Proposal } from "@/lib/business-logic";

export async function GET(request: NextRequest) {
  const profile = await requireProfile();
  if (profile.role === "bidder") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const scope = request.nextUrl.searchParams.get("scope") === "all" ? "all" : "month";
  const monthKey = resolveMonthParam(request.nextUrl.searchParams.get("month") ?? undefined);

  const supabase = await createClient();
  const { data: bidders } = await supabase.from("profiles").select("id, full_name");
  const bidderMap = new Map((bidders ?? []).map((b) => [b.id, b.full_name]));

  let query = supabase.from("proposals").select("*");
  if (scope === "month") query = query.eq("month", monthKey);
  const { data: proposals } = await query;

  const sorted = ((proposals ?? []) as Proposal[]).slice().sort((a, b) =>
    (a.month + (bidderMap.get(a.bidder_id) ?? "") + a.date_sent).localeCompare(
      b.month + (bidderMap.get(b.bidder_id) ?? "") + b.date_sent
    )
  );
  const rows = sorted.map((p) => ({ proposal: p, bidderName: bidderMap.get(p.bidder_id) ?? "Unknown" }));

  let pool: { month: string; bidderName: string; connects: number }[] = [];
  if (scope === "all") {
    const { data: poolRows } = await supabase.from("refund_pool").select("*").gt("connects", 0);
    pool = (poolRows ?? []).map((r) => ({
      month: r.month,
      bidderName: bidderMap.get(r.bidder_id) ?? "Unknown",
      connects: r.connects,
    }));
  }

  const csv = "﻿" + buildCsv(rows, pool);
  const filename = scope === "all" ? "qualix-bid-tracker-all-data.csv" : `qualix-bids-${monthKey}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
