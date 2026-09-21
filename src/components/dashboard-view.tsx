"use client";

import { useState } from "react";
import Link from "next/link";
import {
  agg,
  money,
  monthLabel,
  paceFor,
  pct,
  resolveTargets,
  type Proposal,
  type TargetRow,
} from "@/lib/business-logic";
import { KpiCard } from "@/components/kpi-card";
import { ProgressBar } from "@/components/progress-bar";
import { TargetsDialog, type TargetFormBidder } from "@/components/targets-dialog";
import { ROLE_LABELS } from "@/lib/roles";
import type { UserRole } from "@/lib/database.types";

const ACCENT = "var(--color-accent-700)";
const SAGE = "var(--color-accent-2-700)";
const WARN = "var(--color-accent-400)";

export interface DashboardBidder {
  id: string;
  full_name: string;
  initials: string;
}

export function DashboardView({
  role,
  monthKey,
  bidders,
  proposals,
  targetRows,
  poolByBidder,
}: {
  role: UserRole;
  monthKey: string;
  bidders: DashboardBidder[];
  proposals: Proposal[];
  targetRows: TargetRow[];
  poolByBidder: Record<string, number>;
}) {
  const [targetsOpen, setTargetsOpen] = useState(false);

  const totalPool = Object.values(poolByBidder).reduce((a, v) => a + v, 0);
  const all = agg(proposals, totalPool);

  const perBidder = bidders.map((b) => {
    const list = proposals.filter((p) => p.bidder_id === b.id);
    const targets = resolveTargets(
      targetRows.filter((t) => t.bidder_id === b.id),
      monthKey
    );
    const aggregate = agg(list, poolByBidder[b.id] ?? 0);
    return { bidder: b, targets, aggregate };
  });

  const totalTargets = perBidder.reduce(
    (o, p) => ({
      leads: o.leads + p.targets.leadsTarget,
      connects: o.connects + p.targets.connectsCap,
      revenue: o.revenue + p.targets.revenueTarget,
    }),
    { leads: 0, connects: 0, revenue: 0 }
  );

  const kpis = [
    {
      label: "Proposals sent",
      value: String(all.proposals),
      pct: pct(all.proposals, bidders.length * 40),
      sub: all.proposals ? `${all.pending} still unreviewed` : "Nothing logged yet this month",
      color: ACCENT,
      bg: "var(--color-surface)",
    },
    {
      label: "Leads generated",
      value: `${all.leads} / ${totalTargets.leads}`,
      pct: pct(all.leads, totalTargets.leads),
      sub: `${pct(all.leads, totalTargets.leads)}% of the monthly team target`,
      color: SAGE,
      bg: "var(--color-accent-2-100)",
    },
    {
      label: "Viewed ratio",
      value: `${all.viewedPct}%`,
      pct: all.viewedPct,
      sub: `${all.viewed} of ${all.proposals} proposals opened by the client`,
      color: ACCENT,
      bg: "var(--color-surface)",
    },
    {
      label: "Net connects",
      value: `${all.connects} / ${totalTargets.connects}`,
      pct: pct(all.connects, totalTargets.connects),
      sub: `${all.spent} spent · ${all.refunded} refunded back`,
      color: ACCENT,
      bg: "var(--color-accent-100)",
    },
    {
      label: "Lead value",
      value: money(all.value),
      pct: pct(all.value, totalTargets.revenue),
      sub: all.leads
        ? `${money(all.confirmedValue)} confirmed after review (${all.confirmed} of ${all.leads} leads) · target ${money(totalTargets.revenue)}`
        : `of ${money(totalTargets.revenue)} target`,
      color: SAGE,
      bg: "var(--color-surface)",
    },
    {
      label: "Quality 4★+",
      value: `${all.highQ} / ${all.scored.length}`,
      pct: pct(all.highQ, all.scored.length),
      sub: all.scored.length
        ? `avg ${all.avgScore.toFixed(1)}★ · ${all.highQLeads} of these became leads (${money(all.highQValue)})`
        : "Nothing evaluated yet this month",
      color: SAGE,
      bg: "var(--color-accent-2-100)",
    },
  ];

  const ranked = perBidder.slice().sort((x, y) => {
    const rx = x.targets.leadsTarget ? x.aggregate.leads / x.targets.leadsTarget : x.aggregate.leads ? Infinity : 0;
    const ry = y.targets.leadsTarget ? y.aggregate.leads / y.targets.leadsTarget : y.aggregate.leads ? Infinity : 0;
    return ry - rx;
  });

  const leaderboard = ranked.map(({ bidder, aggregate: a, targets }, i) => {
    const lp = pct(a.leads, targets.leadsTarget);
    const pace = paceFor(a, targets.leadsTarget);
    const paceTag = pace === "No activity" ? "tag-neutral" : pace === "Behind pace" ? "tag-accent" : pace === "Target met" ? "tag-accent-2" : "tag-neutral";
    return {
      bidder,
      pace,
      paceTag,
      avatarBg: i === 0 ? "var(--color-accent)" : "var(--color-neutral-600)",
      summary: `${a.proposals} proposals · ${a.viewedPct}% viewed · ${pct(a.leads, a.proposals)}% conversion · ${a.highQ} rated 4★+`,
      leadsLabel: `${a.leads} of ${targets.leadsTarget}`,
      leadsPct: lp,
      leadsColor: pace === "Behind pace" ? WARN : SAGE,
      connectsLabel: `${a.connects} of ${targets.connectsCap}`,
      connectsPct: pct(a.connects, targets.connectsCap),
      connectsColor: a.connects > targets.connectsCap ? WARN : ACCENT,
      valueLabel: `${money(a.value)} of ${money(targets.revenueTarget)}`,
      valuePct: pct(a.value, targets.revenueTarget),
      pending: a.pending ? `${a.pending} pending` : "clear",
      pendingTag: a.pending ? "tag-accent" : "tag-accent-2",
    };
  });

  const behindCount = leaderboard.filter((b) => b.pace === "Behind pace").length;

  const targetFormBidders: TargetFormBidder[] = perBidder.map(({ bidder, targets }) => ({
    id: bidder.id,
    name: bidder.full_name,
    initials: bidder.initials,
    leadsTarget: targets.leadsTarget,
    connectsCap: targets.connectsCap,
    revenueTarget: targets.revenueTarget,
    overridden: targets.overridden,
  }));

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          gap: "var(--space-6)",
          flexWrap: "wrap",
          marginBottom: "var(--space-8)",
        }}
      >
        <div style={{ maxWidth: "20ch" }}>
          <div className="card-kicker" style={{ marginBottom: "var(--space-2)" }}>
            {ROLE_LABELS[role]} · {monthLabel(monthKey)}
          </div>
          <h1 style={{ fontSize: 58, lineHeight: 0.98 }}>Team performance</h1>
        </div>
        <div style={{ maxWidth: "34ch", display: "flex", flexDirection: "column", gap: "var(--space-3)", alignItems: "flex-start" }}>
          <p style={{ margin: 0, fontSize: 15, color: "var(--color-neutral-700)" }}>
            {all.proposals} proposals across {bidders.length} bidder{bidders.length === 1 ? "" : "s"} · {all.leads} leads ·{" "}
            {money(all.value)} in pipeline value.
          </p>
          <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
            <a className="btn btn-primary" href="/api/export?scope=all">
              Download all data
            </a>
            <a className="btn btn-secondary" href={`/api/export?scope=month&month=${monthKey}`}>
              This month only
            </a>
            <button type="button" className="btn btn-secondary" onClick={() => setTargetsOpen(true)}>
              Edit targets
            </button>
          </div>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(215px, 1fr))",
          gap: "var(--space-3)",
          marginBottom: "calc(var(--space-8) * 1.4)",
        }}
      >
        {kpis.map((k) => (
          <KpiCard key={k.label} {...k} />
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "flex-end", gap: "var(--space-3)", marginBottom: "var(--space-4)", flexWrap: "wrap" }}>
        <h2 style={{ fontSize: 36 }}>Bidders</h2>
        <span className="text-muted" style={{ fontSize: 14, paddingBottom: 5 }}>
          Ranked by leads against target
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", marginBottom: "calc(var(--space-8) * 1.4)" }}>
        {leaderboard.map((b) => (
          <Link
            key={b.bidder.id}
            href={`/profile/${b.bidder.id}?month=${monthKey}`}
            className="elev-sm row"
            style={{
              cursor: "pointer",
              display: "flex",
              flexWrap: "wrap",
              gap: "var(--space-4)",
              alignItems: "center",
              padding: "var(--space-4) var(--space-6)",
              borderRadius: "calc(var(--radius-lg) * 1.15)",
              textDecoration: "none",
              color: "inherit",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", minWidth: 0, flex: "1 1 230px" }}>
              <span
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: "50%",
                  flex: "none",
                  display: "grid",
                  placeItems: "center",
                  fontSize: 14,
                  fontFamily: "var(--font-heading)",
                  background: b.avatarBg,
                  color: "var(--color-on-accent)",
                }}
              >
                {b.bidder.initials}
              </span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: "var(--font-heading)", fontSize: 19, lineHeight: 1.15 }}>{b.bidder.full_name}</div>
                <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 5, flexWrap: "wrap" }}>
                  <span className={`tag ${b.paceTag}`}>{b.pace}</span>
                  <span className="text-muted" style={{ fontSize: 12 }}>
                    {b.summary}
                  </span>
                </div>
              </div>
            </div>
            <div style={{ flex: "1 1 320px", minWidth: 0, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "var(--space-4)" }}>
              <ProgressBar label="Leads" valueLabel={b.leadsLabel} pct={b.leadsPct} color={b.leadsColor} />
              <ProgressBar label="Net connects" valueLabel={b.connectsLabel} pct={b.connectsPct} color={b.connectsColor} />
              <ProgressBar label="Lead value" valueLabel={b.valueLabel} pct={b.valuePct} color="var(--color-accent-2-500)" />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", flex: "0 0 auto", marginLeft: "auto" }}>
              <span className={`tag ${b.pendingTag}`}>{b.pending}</span>
              <span
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: "50%",
                  display: "grid",
                  placeItems: "center",
                  background: "var(--color-neutral-100)",
                  color: "var(--color-accent-700)",
                  fontSize: 17,
                }}
              >
                ›
              </span>
            </div>
          </Link>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "var(--space-3)" }}>
        <div className="card elev-sm" style={{ padding: "var(--space-6)", gap: "var(--space-3)", background: "var(--color-accent-100)" }}>
          <div className="card-kicker">Review backlog</div>
          <div className="card-title" style={{ fontSize: 24 }}>
            {all.pending} proposal{all.pending === 1 ? "" : "s"} unreviewed
          </div>
          <p className="card-body" style={{ fontSize: 14 }}>
            {all.pending ? "Score them so their lead value counts toward the team's confirmed pipeline." : "The queue is clear for this month."}
          </p>
          <Link href="/review" className="btn btn-primary" style={{ alignSelf: "flex-start" }}>
            Open review queue
          </Link>
        </div>
        <div className="card elev-sm" style={{ padding: "var(--space-6)", gap: "var(--space-3)" }}>
          <div className="card-kicker" style={{ color: "var(--color-accent-2-700)" }}>
            Boosted &amp; refunds
          </div>
          <div className="card-title" style={{ fontSize: 24 }}>
            {all.boosted} boosted this month
          </div>
          <p className="card-body" style={{ fontSize: 14 }}>
            {all.refunded} connects refunded back across the team so far.
          </p>
          <Link href="/bidder" className="btn btn-secondary" style={{ alignSelf: "flex-start" }}>
            Reconcile connects
          </Link>
        </div>
        <div className="card elev-sm" style={{ padding: "var(--space-6)", gap: "var(--space-3)", background: "var(--color-accent-2-100)" }}>
          <div className="card-kicker" style={{ color: "var(--color-accent-2-700)" }}>
            Month pacing
          </div>
          <div className="card-title" style={{ fontSize: 24 }}>
            {pct(all.leads, totalTargets.leads)}% of the month target
          </div>
          <p className="card-body" style={{ fontSize: 14 }}>
            {behindCount} of {bidders.length} bidder(s) behind pace on leads. Net connects usage is at{" "}
            {pct(all.connects, totalTargets.connects)}% of the combined cap.
          </p>
        </div>
      </div>

      {targetsOpen && (
        <TargetsDialog monthKey={monthKey} bidders={targetFormBidders} onClose={() => setTargetsOpen(false)} />
      )}
    </div>
  );
}
