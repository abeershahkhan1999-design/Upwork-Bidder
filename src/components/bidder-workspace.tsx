"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  STATUS_OPTIONS,
  agg,
  money,
  monthLabel,
  pct,
  type Proposal,
  type ResolvedTargets,
} from "@/lib/business-logic";
import { KpiCard } from "@/components/kpi-card";
import { ProposalRow } from "@/components/proposal-row";
import { EmptyState } from "@/components/empty-state";
import { ProposalModal, type BidderOption } from "@/components/proposal-modal";
import { ReconciliationDialog } from "@/components/reconciliation-dialog";
import type { UserRole } from "@/lib/database.types";

const ACCENT = "var(--color-accent-700)";
const SAGE = "var(--color-accent-2-700)";

const ALL_STATUSES = "All statuses";

export function BidderWorkspace({
  currentRole,
  monthKey,
  viewingBidder,
  allBidders,
  showBidderPicker,
  proposals,
  targets,
  poolConnects,
  canEdit,
  canExportAll,
}: {
  currentRole: UserRole;
  monthKey: string;
  viewingBidder: BidderOption;
  allBidders: BidderOption[];
  showBidderPicker: boolean;
  proposals: Proposal[];
  targets: ResolvedTargets;
  poolConnects: number;
  canEdit: boolean;
  canExportAll: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(ALL_STATUSES);
  const [leadOnly, setLeadOnly] = useState(false);
  const [boostOnly, setBoostOnly] = useState(false);
  const [highQOnly, setHighQOnly] = useState(false);
  const [unevalOnly, setUnevalOnly] = useState(false);

  const [dialog, setDialog] = useState<"new" | Proposal | null>(null);
  const [reconOpen, setReconOpen] = useState(false);

  const all = useMemo(() => agg(proposals, poolConnects), [proposals, poolConnects]);

  const q = search.trim().toLowerCase();
  const rows = proposals.filter((p) => {
    if (q) {
      const haystack = (p.title + p.category + (p.subcategory || "") + p.country + p.status).toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    if (statusFilter !== ALL_STATUSES && p.status !== statusFilter) return false;
    if (leadOnly && !p.lead) return false;
    if (boostOnly && !p.boosted) return false;
    if (highQOnly && (p.score ?? 0) < 4) return false;
    if (unevalOnly && p.score != null) return false;
    return true;
  });

  const filtersActive =
    q || statusFilter !== ALL_STATUSES || leadOnly || boostOnly || highQOnly || unevalOnly;

  function pickBidder(id: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("bidder", id);
    router.push(`/bidder?${params.toString()}`);
  }

  const kpis = [
    {
      label: "Viewed ratio",
      value: `${all.viewedPct}%`,
      pct: all.viewedPct,
      sub: `${all.viewed} of ${all.proposals} proposals opened by the client`,
      color: ACCENT,
      bg: "var(--color-surface)",
    },
    {
      label: "Leads this month",
      value: `${all.leads} / ${targets.leadsTarget}`,
      pct: pct(all.leads, targets.leadsTarget),
      sub: `${pct(all.leads, targets.leadsTarget)}% of the monthly target`,
      color: SAGE,
      bg: "var(--color-accent-2-100)",
    },
    {
      label: "Net connects",
      value: `${all.connects} / ${targets.connectsCap}`,
      pct: pct(all.connects, targets.connectsCap),
      sub: `${all.spent} spent · ${all.refunded} refunded back`,
      color: ACCENT,
      bg: "var(--color-accent-100)",
    },
    {
      label: "Lead value",
      value: money(all.value),
      pct: pct(all.value, targets.revenueTarget),
      sub: all.leads
        ? `${money(all.confirmedValue)} confirmed (${all.confirmed} of ${all.leads} leads)`
        : `of ${money(targets.revenueTarget)} target`,
      color: SAGE,
      bg: "var(--color-surface)",
    },
    {
      label: "Quality 4★+",
      value: `${all.highQ} / ${all.scored.length}`,
      pct: pct(all.highQ, all.scored.length),
      sub: all.scored.length ? `avg ${all.avgScore.toFixed(1)}★` : "Nothing evaluated yet",
      color: SAGE,
      bg: "var(--color-accent-2-100)",
    },
  ];

  const chip = (label: string, active: boolean, onClick: () => void) => (
    <button
      key={label}
      type="button"
      className="btn btn-sm"
      onClick={onClick}
      style={{
        background: active ? "var(--color-accent-200)" : "var(--color-neutral-300)",
        color: active ? "var(--color-accent-700)" : "var(--color-neutral-700)",
        border: "1px solid var(--color-divider)",
      }}
    >
      {label}
    </button>
  );

  return (
    <div>
      {showBidderPicker && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: "var(--space-6)", alignItems: "center" }}>
          <span className="text-muted" style={{ fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", marginRight: 4 }}>
            Viewing
          </span>
          {allBidders.map((b) => (
            <button
              key={b.id}
              type="button"
              className="btn btn-sm"
              onClick={() => pickBidder(b.id)}
              style={{
                background: b.id === viewingBidder.id ? "var(--color-accent)" : "var(--color-neutral-300)",
                color: b.id === viewingBidder.id ? "var(--color-on-accent)" : "var(--color-neutral-700)",
                border: "1px solid var(--color-divider)",
              }}
            >
              {b.name}
            </button>
          ))}
        </div>
      )}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          gap: "var(--space-6)",
          flexWrap: "wrap",
          marginBottom: "var(--space-6)",
        }}
      >
        <div>
          <div className="card-kicker" style={{ marginBottom: "var(--space-2)" }}>
            Bidder workspace · {monthLabel(monthKey)}
          </div>
          <h1 style={{ fontSize: 58, lineHeight: 0.98 }}>{viewingBidder.name}</h1>
        </div>
        <div style={{ maxWidth: "34ch" }}>
          <p style={{ margin: "0 0 8px", color: "var(--color-neutral-700)" }}>
            {monthLabel(monthKey)} · {all.proposals} proposals · {all.leads} leads · {all.pending} awaiting review
          </p>
          <p style={{ margin: 0, fontSize: 12, color: "var(--color-neutral-600)" }}>
            {currentRole === "bidder"
              ? "You can log new proposals. Only the team lead or admin can edit or review them."
              : "You can edit any entry here and review it from the queue."}
          </p>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
          gap: "var(--space-3)",
          marginBottom: "calc(var(--space-8) * 1.2)",
        }}
      >
        {kpis.map((k) => (
          <KpiCard key={k.label} {...k} valueSize={34} />
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "flex-end", gap: "var(--space-3)", marginBottom: "var(--space-3)", flexWrap: "wrap" }}>
        <h2 style={{ fontSize: 36 }}>Proposals</h2>
        <span className="text-muted" style={{ fontSize: 14, paddingBottom: 5 }}>
          {rows.length} of {proposals.length}
        </span>
        <div style={{ marginLeft: "auto", display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
          <button type="button" className="btn btn-secondary" onClick={() => setReconOpen(true)}>
            Paste connects history
          </button>
          {canExportAll && (
            <a className="btn btn-secondary" href="/api/export?scope=all">
              Download all data
            </a>
          )}
          <button type="button" className="btn btn-primary" onClick={() => setDialog("new")}>
            + Log proposal
          </button>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: "var(--space-2)",
          alignItems: "center",
          flexWrap: "wrap",
          marginBottom: "var(--space-4)",
          padding: "var(--space-2)",
          borderRadius: 999,
          background: "var(--color-surface)",
        }}
      >
        <input
          className="input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search job, category, country…"
          style={{ maxWidth: 320, background: "var(--color-neutral-100)" }}
        />
        <select
          className="select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ maxWidth: 180, background: "var(--color-neutral-100)" }}
        >
          <option value={ALL_STATUSES}>{ALL_STATUSES}</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        {chip("Leads only", leadOnly, () => setLeadOnly((v) => !v))}
        {chip("Boosted", boostOnly, () => setBoostOnly((v) => !v))}
        {chip("4★+ quality", highQOnly, () => setHighQOnly((v) => !v))}
        {chip("Not evaluated", unevalOnly, () => setUnevalOnly((v) => !v))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
        {rows.map((p) => (
          <ProposalRow key={p.id} proposal={p} showEdit={canEdit} onEdit={() => setDialog(p)} />
        ))}
      </div>

      {rows.length === 0 && proposals.length === 0 && (
        <EmptyState
          title={`No proposals in ${monthLabel(monthKey)}`}
          body="Log the first proposal to start tracking this month's pipeline."
          action={
            <button type="button" className="btn btn-primary" onClick={() => setDialog("new")}>
              + Log the first proposal
            </button>
          }
        />
      )}
      {rows.length === 0 && proposals.length > 0 && filtersActive && (
        <EmptyState title="Nothing matches these filters" body="Try clearing the search or the filters above." />
      )}

      {dialog && (
        <ProposalModal
          proposal={dialog === "new" ? null : dialog}
          bidders={allBidders}
          lockedBidder={currentRole === "bidder" ? viewingBidder : null}
          onClose={() => setDialog(null)}
        />
      )}
      {reconOpen && (
        <ReconciliationDialog
          bidderId={viewingBidder.id}
          bidderName={viewingBidder.name}
          monthKey={monthKey}
          pool={proposals.map((p) => ({ id: p.id, title: p.title }))}
          onClose={() => setReconOpen(false)}
        />
      )}
    </div>
  );
}
