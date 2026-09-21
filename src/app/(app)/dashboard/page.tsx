import { requireAdminOrLead } from "@/lib/auth";
import { getBidders, getProposalsForMonth, getRefundPool, getTargets } from "@/lib/data";
import { resolveMonthParam } from "@/lib/business-logic";
import { DashboardView } from "@/components/dashboard-view";
import { EmptyState } from "@/components/empty-state";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month } = await searchParams;
  const profile = await requireAdminOrLead();
  const monthKey = resolveMonthParam(month);

  const bidders = await getBidders();
  if (!bidders.length) {
    return (
      <EmptyState
        title="No bidders yet"
        body="Seed the three Qualix profiles in Supabase to see team performance here."
      />
    );
  }

  const [proposals, targetRows, poolRows] = await Promise.all([
    getProposalsForMonth(monthKey),
    getTargets(),
    getRefundPool(monthKey),
  ]);

  const poolByBidder = Object.fromEntries(poolRows.map((r) => [r.bidder_id, r.connects]));

  return (
    <DashboardView
      role={profile.role}
      monthKey={monthKey}
      bidders={bidders.map((b) => ({ id: b.id, full_name: b.full_name, initials: b.initials }))}
      proposals={proposals}
      targetRows={targetRows}
      poolByBidder={poolByBidder}
    />
  );
}
