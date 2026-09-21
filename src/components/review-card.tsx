"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RANGES, bandFor, fmtDate, money, statusLabel, type Proposal } from "@/lib/business-logic";
import { saveReview } from "@/app/actions/review";

function statusTagClass(p: Proposal): string {
  if (p.status === "hired") return "tag-accent-2";
  if (p.status === "interview" || p.status === "replied") return "tag-accent";
  return "tag-neutral";
}

export function ReviewCard({
  proposal,
  bidderName,
  onEdit,
}: {
  proposal: Proposal;
  bidderName: string;
  onEdit: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [score, setScore] = useState(proposal.score ?? 0);
  const [hoverScore, setHoverScore] = useState(0);
  const [comment, setComment] = useState(proposal.comment ?? "");
  const [actualValue, setActualValue] = useState(
    proposal.actual_value != null ? String(proposal.actual_value) : ""
  );

  const dirty =
    score !== (proposal.score ?? 0) ||
    comment !== (proposal.comment ?? "") ||
    actualValue !== (proposal.actual_value != null ? String(proposal.actual_value) : "");

  const saveLabel = !score ? "Rate to save" : pending ? "Saving…" : dirty ? "Save evaluation" : "Saved";
  const canSave = score > 0 && dirty && !pending;

  const note = useMemo(() => {
    if (!proposal.lead) return "Mark this as a lead first to confirm a value.";
    const n = actualValue === "" ? null : Number(actualValue);
    if (n != null && n !== proposal.lead_value) {
      return `Reporting ${money(n)} instead of the ${bandFor(proposal.lead_value).short} estimate.`;
    }
    return `Bidder estimated ${bandFor(proposal.lead_value).short}.`;
  }, [proposal.lead, proposal.lead_value, actualValue]);

  function save() {
    startTransition(async () => {
      await saveReview({
        proposalId: proposal.id,
        score,
        comment,
        actualValue: proposal.lead ? (actualValue === "" ? null : Number(actualValue)) : null,
      });
      router.refresh();
    });
  }

  return (
    <div className="card elev-sm" style={{ padding: "var(--space-6)", gap: "var(--space-4)" }}>
      <div style={{ display: "flex", gap: "var(--space-4)", alignItems: "flex-start", flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 320px", minWidth: 0 }}>
          <div className="card-kicker">
            {bidderName} · {fmtDate(proposal.date_sent)}
          </div>
          <a
            href={proposal.url ?? "#"}
            target="_blank"
            rel="noopener"
            style={{ fontFamily: "var(--font-heading)", fontSize: 22, textDecoration: "none", display: "block", margin: "6px 0" }}
          >
            {proposal.title} ↗
          </a>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
            <span className="tag tag-neutral">{proposal.connects} connects</span>
            <span className="tag tag-neutral">${proposal.client_budget}</span>
            <span className="tag tag-neutral">{proposal.country}</span>
            <span className={`tag ${statusTagClass(proposal)}`}>{statusLabel(proposal.status)}</span>
            <span className={`tag ${proposal.lead ? "tag-accent-2" : "tag-neutral"}`}>
              {proposal.lead ? (proposal.actual_value != null ? "Lead · confirmed" : "Lead · est.") : "No lead"}
            </span>
            {proposal.boosted && <span className="tag tag-neutral">Boosted +{proposal.boost_connects || 0}</span>}
          </div>
        </div>
        <div style={{ flex: "0 0 auto", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
          <div className="text-muted" style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Quality
          </div>
          <div style={{ display: "flex", gap: 2, padding: "6px 12px", borderRadius: 999, background: "var(--color-neutral-100)" }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setScore(n)}
                onMouseEnter={() => setHoverScore(n)}
                onMouseLeave={() => setHoverScore(0)}
                title={`${n} star${n === 1 ? "" : "s"}`}
                style={{
                  border: 0,
                  background: "transparent",
                  cursor: "pointer",
                  fontSize: 26,
                  lineHeight: 1,
                  padding: "0 3px",
                  color: n <= (hoverScore || score) ? "var(--color-accent-2)" : "var(--color-neutral-500)",
                  transform: n === hoverScore ? "scale(1.15)" : undefined,
                  transition: "transform 0.1s ease, color 0.1s ease",
                }}
              >
                ★
              </button>
            ))}
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: "var(--space-3)",
          alignItems: "flex-end",
          flexWrap: "wrap",
          padding: "var(--space-3)",
          borderRadius: "var(--radius-lg)",
          background: "var(--color-neutral-100)",
        }}
      >
        <div style={{ width: 190 }}>
          <label className="field-label">Confirmed lead value ($)</label>
          <input
            className="input"
            type="number"
            value={actualValue}
            onChange={(e) => setActualValue(e.target.value)}
            placeholder={String(proposal.lead_value || "")}
            disabled={!proposal.lead}
          />
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", paddingBottom: 6 }}>
          {RANGES.map((r) => (
            <button
              key={r.label}
              type="button"
              className="btn btn-sm"
              disabled={!proposal.lead}
              onClick={() => setActualValue(String(r.mid))}
              style={{
                background: Number(actualValue) === r.mid ? "var(--color-accent-200)" : "var(--color-neutral-300)",
                color: Number(actualValue) === r.mid ? "var(--color-accent-700)" : "var(--color-neutral-700)",
                border: "1px solid var(--color-divider)",
                fontSize: 12,
                padding: "7px 14px",
              }}
            >
              {r.short}
            </button>
          ))}
        </div>
        <span className="text-muted" style={{ fontSize: 12, flex: "1 1 200px", minWidth: 0 }}>
          {note}
        </span>
      </div>

      <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center", flexWrap: "wrap" }}>
        <input
          className="input"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Feedback for the bidder…"
          style={{ flex: "1 1 280px" }}
        />
        <button type="button" className="btn btn-secondary" onClick={onEdit}>
          Edit entry
        </button>
        <button type="button" className="btn btn-primary" disabled={!canSave} onClick={save}>
          {saveLabel}
        </button>
      </div>
    </div>
  );
}
