import { requireProfile } from "@/lib/auth";
import { getBidders, getProposalsForMonth, getRefundPool, getTargets } from "@/lib/data";
import { resolveMonthParam, resolveTargets } from "@/lib/business-logic";
import { BidderWorkspace } from "@/components/bidder-workspace";
import { EmptyState } from "@/components/empty-state";

export default async function BidderPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; bidder?: string }>;
}) {
  const { month, bidder } = await searchParams;
  const profile = await requireProfile();
  const monthKey = resolveMonthParam(month);

  const bidders = await getBidders();

  const viewingBidderId =
    profile.role === "bidder"
      ? profile.id
      : bidder && bidders.some((b) => b.id === bidder)
        ? bidder
        : bidders[0]?.id;

  if (!viewingBidderId) {
    return (
      <EmptyState
        title="No bidders yet"
        body="Seed the three Qualix profiles in Supabase to start logging proposals."
      />
    );
  }

  const viewingBidder =
    profile.role === "bidder"
      ? { id: profile.id, name: profile.full_name }
      : (() => {
          const b = bidders.find((x) => x.id === viewingBidderId)!;
          return { id: b.id, name: b.full_name };
        })();

  const [proposals, targetRows, pool] = await Promise.all([
    getProposalsForMonth(monthKey, viewingBidderId),
    getTargets(viewingBidderId),
    getRefundPool(monthKey, viewingBidderId),
  ]);

  const targets = resolveTargets(targetRows, monthKey);
  const poolConnects = pool[0]?.connects ?? 0;

  return (
    <BidderWorkspace
      currentRole={profile.role}
      monthKey={monthKey}
      viewingBidder={viewingBidder}
      allBidders={bidders.map((b) => ({ id: b.id, name: b.full_name }))}
      showBidderPicker={profile.role !== "bidder"}
      proposals={proposals}
      targets={targets}
      poolConnects={poolConnects}
      canEdit={profile.role !== "bidder"}
      canExportAll={profile.role !== "bidder"}
    />
  );
}
