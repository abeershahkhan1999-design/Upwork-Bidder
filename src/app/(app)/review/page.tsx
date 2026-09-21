import { requireAdminOrLead } from "@/lib/auth";
import { getBidders, getProposalsForMonth } from "@/lib/data";
import { resolveMonthParam } from "@/lib/business-logic";
import { ReviewQueue } from "@/components/review-queue";

export default async function ReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month } = await searchParams;
  await requireAdminOrLead();
  const monthKey = resolveMonthParam(month);

  const [bidders, proposals] = await Promise.all([getBidders(), getProposalsForMonth(monthKey)]);

  return (
    <ReviewQueue
      monthKey={monthKey}
      bidders={bidders.map((b) => ({ id: b.id, name: b.full_name }))}
      proposals={proposals}
    />
  );
}
