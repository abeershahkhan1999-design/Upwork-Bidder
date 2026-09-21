import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminOrLead } from "@/lib/auth";
import { getAllProfiles, getProposalsForBidderMonths } from "@/lib/data";
import { agg, money, monthLabel, netOf, resolveMonthParam, shiftMonth } from "@/lib/business-logic";
import { ProposalRow } from "@/components/proposal-row";
import { EmptyState } from "@/components/empty-state";

export default async function BidderProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ bidderId: string }>;
  searchParams: Promise<{ month?: string }>;
}) {
  await requireAdminOrLead();
  const { bidderId } = await params;
  const { month } = await searchParams;
  const monthKey = resolveMonthParam(month);

  const profiles = await getAllProfiles();
  const bidder = profiles.find((p) => p.id === bidderId && p.role === "bidder");
  if (!bidder) notFound();

  const months = [shiftMonth(monthKey, -2), shiftMonth(monthKey, -1), monthKey];
  const proposals = await getProposalsForBidderMonths(bidderId, months);
  const thisMonth = proposals.filter((p) => p.month === monthKey);
  const all = agg(thisMonth);

  const netConnects = thisMonth.reduce((a, p) => a + netOf(p), 0);
  const connectsPerLead = all.leads ? Math.round(netConnects / all.leads) : 0;

  const stats = [
    { label: "Proposals", value: String(all.proposals), sub: monthLabel(monthKey) },
    { label: "Viewed ratio", value: `${all.viewedPct}%`, sub: `${all.viewed} of ${all.proposals}` },
    { label: "Leads", value: String(all.leads), sub: `${all.confirmed} confirmed` },
    { label: "Lead value", value: money(all.value), sub: `${money(all.confirmedValue)} confirmed` },
    { label: "Avg review score", value: all.scored.length ? `${all.avgScore.toFixed(1)}★` : "—", sub: `${all.scored.length} evaluated` },
    { label: "Quality 4★+", value: `${all.highQ} / ${all.scored.length}`, sub: "of evaluated" },
    { label: "Connects per lead", value: all.leads ? String(connectsPerLead) : "—", sub: `${netConnects} net connects` },
  ];

  const maxLeads = Math.max(1, ...months.map((m) => proposals.filter((p) => p.month === m && p.lead).length));
  const trend = months.map((m, i) => {
    const leads = proposals.filter((p) => p.month === m && p.lead).length;
    return {
      month: monthLabel(m).split(" ")[0],
      leads,
      h: Math.max(4, Math.round((leads / maxLeads) * 100)),
      color: i === months.length - 1 ? "var(--color-accent)" : "var(--color-accent-300)",
    };
  });

  return (
    <div>
      <Link href="/dashboard" className="btn btn-ghost" style={{ marginBottom: "var(--space-3)", display: "inline-flex" }}>
        ‹ Back to dashboard
      </Link>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)", marginBottom: "var(--space-6)", flexWrap: "wrap" }}>
        <span
          style={{
            width: 88,
            height: 88,
            borderRadius: "50%",
            flex: "none",
            display: "grid",
            placeItems: "center",
            fontSize: 28,
            fontFamily: "var(--font-heading)",
            background: "var(--color-accent)",
            color: "var(--color-on-accent)",
          }}
        >
          {bidder.initials}
        </span>
        <div>
          <h1 style={{ margin: 0, fontSize: 52, lineHeight: 1 }}>{bidder.full_name}</h1>
          <div className="text-muted" style={{ marginTop: 6 }}>
            {monthLabel(monthKey)} · {all.proposals} proposal{all.proposals === 1 ? "" : "s"} this month
          </div>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
          gap: "var(--space-3)",
          marginBottom: "calc(var(--space-8) * 1.2)",
        }}
      >
        {stats.map((s) => (
          <div key={s.label} className="card elev-sm" style={{ padding: "var(--space-4)" }}>
            <div className="card-kicker">{s.label}</div>
            <div style={{ fontFamily: "var(--font-heading)", fontSize: 32, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 13, color: "var(--color-neutral-600)", lineHeight: 1.4 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      <h2 style={{ fontSize: 32, marginBottom: "var(--space-3)" }}>Three-month trend</h2>
      <div className="card elev-sm" style={{ padding: "var(--space-6)", marginBottom: "calc(var(--space-8) * 1.2)" }}>
        <div style={{ display: "flex", gap: "var(--space-6)", alignItems: "flex-end", height: 190, paddingTop: "var(--space-2)" }}>
          {trend.map((t) => (
            <div key={t.month} style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "center", gap: 8, height: "100%" }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{t.leads}</div>
              <div style={{ width: "100%", maxWidth: 90, borderRadius: "14px 14px 6px 6px", height: `${t.h}%`, background: t.color }} />
              <div className="text-muted" style={{ fontSize: 12 }}>
                {t.month}
              </div>
            </div>
          ))}
        </div>
      </div>

      <h2 style={{ fontSize: 32, marginBottom: "var(--space-3)" }}>Proposals this month</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
        {thisMonth.map((p) => (
          <ProposalRow key={p.id} proposal={p} showBoost={false} />
        ))}
      </div>
      {thisMonth.length === 0 && (
        <EmptyState title={`No proposals in ${monthLabel(monthKey)}`} body="Nothing logged for this bidder in the selected month." />
      )}
    </div>
  );
}
