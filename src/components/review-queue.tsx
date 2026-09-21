"use client";

import { useMemo, useState } from "react";
import { monthLabel, type Proposal } from "@/lib/business-logic";
import { ReviewCard } from "@/components/review-card";
import { EmptyState } from "@/components/empty-state";
import { ProposalModal, type BidderOption } from "@/components/proposal-modal";

type QueueMode = "uneval" | "highQ" | "all";

const ALL_BIDDERS = "All bidders";

export function ReviewQueue({
  monthKey,
  bidders,
  proposals,
}: {
  monthKey: string;
  bidders: BidderOption[];
  proposals: Proposal[];
}) {
  const [mode, setMode] = useState<QueueMode>("uneval");
  const [queueBidder, setQueueBidder] = useState(ALL_BIDDERS);
  const [editing, setEditing] = useState<Proposal | null>(null);

  const bidderName = useMemo(() => {
    const m = new Map(bidders.map((b) => [b.id, b.name]));
    return (id: string) => m.get(id) ?? "Unknown";
  }, [bidders]);

  const queue = proposals.filter((p) => {
    if (queueBidder !== ALL_BIDDERS && bidderName(p.bidder_id) !== queueBidder) return false;
    if (mode === "uneval") return p.score == null;
    if (mode === "highQ") return (p.score ?? 0) >= 4;
    return true;
  });

  const modeBtn = (key: QueueMode, label: string) => (
    <button
      type="button"
      className="btn btn-sm"
      onClick={() => setMode(key)}
      style={{
        background: mode === key ? "var(--color-accent)" : "var(--color-neutral-300)",
        color: mode === key ? "var(--color-on-accent)" : "var(--color-neutral-700)",
        border: "1px solid var(--color-divider)",
        fontSize: 13,
      }}
    >
      {label}
    </button>
  );

  const emptyCopy =
    mode === "uneval"
      ? { title: "Queue clear", body: "Nothing waiting for review this month." }
      : mode === "highQ"
        ? { title: "No 4★+ evaluations yet", body: "Rated proposals with a 4 or 5 star score will show up here." }
        : { title: "No proposals this month", body: "Nothing logged for this bidder in the selected month." };

  return (
    <div>
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
            Review · {monthLabel(monthKey)}
          </div>
          <h1 style={{ fontSize: 58, lineHeight: 0.98 }}>Review queue</h1>
        </div>
        <p style={{ maxWidth: "34ch", margin: 0, color: "var(--color-neutral-700)" }}>
          Score each proposal after the client meeting and confirm the real deal value — it
          replaces the bidder&apos;s estimate everywhere.
        </p>
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
        {modeBtn("uneval", "Not evaluated")}
        {modeBtn("highQ", "4★+ quality")}
        {modeBtn("all", "All this month")}
        <select
          className="select"
          value={queueBidder}
          onChange={(e) => setQueueBidder(e.target.value)}
          style={{ maxWidth: 220, background: "var(--color-neutral-100)" }}
        >
          <option value={ALL_BIDDERS}>{ALL_BIDDERS}</option>
          {bidders.map((b) => (
            <option key={b.id} value={b.name}>
              {b.name}
            </option>
          ))}
        </select>
        <span className="text-muted" style={{ fontSize: 12, marginLeft: "auto" }}>
          {queue.length} proposal{queue.length === 1 ? "" : "s"}
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
        {queue.map((p) => (
          <ReviewCard key={p.id} proposal={p} bidderName={bidderName(p.bidder_id)} onEdit={() => setEditing(p)} />
        ))}
      </div>

      {queue.length === 0 && <EmptyState title={emptyCopy.title} body={emptyCopy.body} />}

      {editing && (
        <ProposalModal proposal={editing} bidders={bidders} lockedBidder={null} onClose={() => setEditing(null)} />
      )}
    </div>
  );
}
