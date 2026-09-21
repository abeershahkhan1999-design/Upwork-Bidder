"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CATEGORIES,
  COUNTRIES,
  RANGES,
  STATUS_OPTIONS,
  SUBCATEGORIES,
  bandFor,
  type Proposal,
} from "@/lib/business-logic";
import type { ProposalStatus } from "@/lib/database.types";
import { saveProposal } from "@/app/actions/proposals";

export interface BidderOption {
  id: string;
  name: string;
}

export function ProposalModal({
  proposal,
  bidders,
  lockedBidder,
  onClose,
}: {
  proposal: Proposal | null;
  bidders: BidderOption[];
  /** Set for a bidder logging their own proposal — the field is shown read-only. */
  lockedBidder: BidderOption | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState(proposal?.title ?? "");
  const [url, setUrl] = useState(proposal?.url ?? "");
  const [connects, setConnects] = useState(String(proposal?.connects ?? 12));
  const [dateSent, setDateSent] = useState(proposal?.date_sent ?? new Date().toISOString().slice(0, 10));
  const [boosted, setBoosted] = useState(proposal?.boosted ?? false);
  const [boostConnects, setBoostConnects] = useState(String(proposal?.boost_connects ?? 0));
  const [refunded, setRefunded] = useState(String(proposal?.refunded_connects ?? 0));
  const [budget, setBudget] = useState(String(proposal?.client_budget ?? ""));
  const [country, setCountry] = useState(proposal?.country ?? COUNTRIES[0]);
  const [category, setCategory] = useState(proposal?.category ?? CATEGORIES[0]);
  const [subcategory, setSubcategory] = useState(
    proposal?.subcategory ?? SUBCATEGORIES[CATEGORIES[0]][0]
  );
  const [status, setStatus] = useState<ProposalStatus>(proposal?.status ?? "no_reply");
  const [bidderId, setBidderId] = useState(proposal?.bidder_id ?? lockedBidder?.id ?? bidders[0]?.id ?? "");
  const [leadRange, setLeadRange] = useState(
    bandFor(proposal?.lead_value || RANGES[1].mid).label
  );
  const [lead, setLead] = useState(proposal?.lead ?? false);

  const subcategoryOptions = useMemo(() => SUBCATEGORIES[category] ?? [], [category]);

  const isEdit = !!proposal;
  const canEditFields = !isEdit || !lockedBidder; // bidders can only create, never edit

  function onCategoryChange(next: string) {
    setCategory(next);
    setSubcategory(SUBCATEGORIES[next]?.[0] ?? "");
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        await saveProposal({
          id: proposal?.id,
          bidder_id: bidderId,
          title,
          url,
          date_sent: dateSent,
          connects: Number(connects) || 0,
          boosted,
          boost_connects: Number(boostConnects) || 0,
          client_budget: Number(budget) || 0,
          country,
          category,
          subcategory,
          status,
          lead,
          lead_value_band: leadRange,
        });
        router.refresh();
        onClose();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't save this proposal.");
      }
    });
  }

  const boostHint = boosted
    ? "Boosted proposals cost extra connects up front but can be refunded if you're outbid or the boost expires."
    : "Standard proposal — no boost connects spent.";

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div
        className="dialog"
        style={{ width: "min(680px, 100%)", maxHeight: "88vh", overflow: "auto", padding: "var(--space-8)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ fontFamily: "var(--font-heading)", fontSize: 30, fontWeight: 600, marginBottom: "var(--space-4)" }}>
          {isEdit ? "Edit proposal" : "Log proposal"}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
          <div style={{ gridColumn: "1 / -1" }}>
            <label className="field-label">Job title</label>
            <input
              className="input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Shopify subscription app — bug fixes"
              disabled={!canEditFields}
            />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label className="field-label">Upwork job link</label>
            <input
              className="input"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.upwork.com/jobs/~01…"
              disabled={!canEditFields}
            />
          </div>
          <div>
            <label className="field-label">Connects spent</label>
            <input
              className="input"
              type="number"
              value={connects}
              onChange={(e) => setConnects(e.target.value)}
              disabled={!canEditFields}
            />
          </div>
          <div>
            <label className="field-label">Date sent</label>
            <input
              className="input"
              type="date"
              value={dateSent}
              onChange={(e) => setDateSent(e.target.value)}
              disabled={!canEditFields}
            />
          </div>

          <div
            style={{
              gridColumn: "1 / -1",
              display: "flex",
              gap: "var(--space-3)",
              alignItems: "flex-end",
              flexWrap: "wrap",
              padding: "var(--space-3)",
              borderRadius: "var(--radius-lg)",
              background: "var(--color-neutral-100)",
            }}
          >
            <button
              type="button"
              className="btn btn-sm"
              disabled={!canEditFields}
              onClick={() => setBoosted((b) => !b)}
              style={{
                background: boosted ? "var(--color-accent-200)" : "var(--color-neutral-300)",
                color: boosted ? "var(--color-accent-700)" : "var(--color-neutral-700)",
                border: "1px solid var(--color-divider)",
              }}
            >
              {boosted ? "⚡ Boosted proposal" : "○ Standard proposal"}
            </button>
            {boosted && (
              <>
                <div className="field" style={{ width: 150 }}>
                  <label className="field-label">Boost connects</label>
                  <input
                    className="input"
                    type="number"
                    value={boostConnects}
                    onChange={(e) => setBoostConnects(e.target.value)}
                    disabled={!canEditFields}
                  />
                </div>
                <div className="field" style={{ width: 150 }}>
                  <label className="field-label">Refunded so far</label>
                  <input
                    className="input"
                    type="number"
                    value={refunded}
                    onChange={(e) => setRefunded(e.target.value)}
                    disabled
                    title="Refunds are applied from the connects history paste, not edited here."
                  />
                </div>
              </>
            )}
            <span className="text-muted" style={{ fontSize: 12, flex: "1 1 200px", minWidth: 0 }}>
              {boostHint}
            </span>
          </div>

          <div>
            <label className="field-label">Client budget ($)</label>
            <input
              className="input"
              type="number"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              disabled={!canEditFields}
            />
          </div>
          <div>
            <label className="field-label">Client country</label>
            <select
              className="select"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              disabled={!canEditFields}
            >
              {COUNTRIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">Upwork category</label>
            <select
              className="select"
              value={category}
              onChange={(e) => onCategoryChange(e.target.value)}
              disabled={!canEditFields}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">Subcategory</label>
            <select
              className="select"
              value={subcategory}
              onChange={(e) => setSubcategory(e.target.value)}
              disabled={!canEditFields}
            >
              {subcategoryOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">Response status</label>
            <select
              className="select"
              value={status}
              onChange={(e) => setStatus(e.target.value as ProposalStatus)}
              disabled={!canEditFields}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">Bidder</label>
            {lockedBidder ? (
              <input className="input" value={lockedBidder.name} disabled />
            ) : (
              <select
                className="select"
                value={bidderId}
                onChange={(e) => setBidderId(e.target.value)}
                disabled={!canEditFields}
              >
                {bidders.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div>
            <label className="field-label">Lead value range</label>
            <select
              className="select"
              value={leadRange}
              onChange={(e) => setLeadRange(e.target.value)}
              disabled={!canEditFields}
            >
              {RANGES.map((r) => (
                <option key={r.label} value={r.label}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <div
            style={{
              gridColumn: "1 / -1",
              display: "flex",
              alignItems: "center",
              gap: "var(--space-4)",
              paddingTop: 4,
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              className="btn btn-sm"
              disabled={!canEditFields}
              onClick={() => setLead((l) => !l)}
              style={{
                background: lead ? "var(--color-accent-2-200)" : "var(--color-neutral-300)",
                color: lead ? "var(--color-accent-2-700)" : "var(--color-neutral-700)",
                border: "1px solid var(--color-divider)",
              }}
            >
              {lead ? "● Lead generated" : "○ No lead yet"}
            </button>
            <span className="text-muted" style={{ fontSize: 12 }}>
              {lead
                ? `Bidder estimate: ${leadRange}. The team lead confirms the real value in review.`
                : "Turn this on once the client confirms they want to hire."}
            </span>
          </div>
        </div>

        {!canEditFields && (
          <p style={{ color: "var(--color-accent-2-600)", fontSize: 13, marginTop: "var(--space-3)" }}>
            Proposals can&apos;t be edited once logged.
          </p>
        )}
        {error && (
          <p style={{ color: "var(--color-accent-2-600)", fontSize: 13, marginTop: "var(--space-3)" }}>
            {error}
          </p>
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "var(--space-2)",
            marginTop: "var(--space-6)",
          }}
        >
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={pending || !title.trim() || !canEditFields}
            onClick={submit}
          >
            {pending ? "Saving…" : isEdit ? "Save changes" : "Log proposal"}
          </button>
        </div>
      </div>
    </div>
  );
}
