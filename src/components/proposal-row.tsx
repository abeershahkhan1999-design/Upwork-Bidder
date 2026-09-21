import {
  bandFor,
  fmtDate,
  isConfirmed,
  money,
  netOf,
  reportedValue,
  spentOf,
  statusLabel,
  type Proposal,
} from "@/lib/business-logic";

function statusTagClass(p: Proposal): string {
  if (p.status === "hired") return "tag-accent-2";
  if (p.status === "interview" || p.status === "replied") return "tag-accent";
  return "tag-neutral";
}

export function ProposalRow({
  proposal,
  showBoost = true,
  showEdit = false,
  onEdit,
}: {
  proposal: Proposal;
  showBoost?: boolean;
  showEdit?: boolean;
  onEdit?: () => void;
}) {
  const spent = spentOf(proposal);
  const ref = proposal.refunded_connects || 0;
  const net = netOf(proposal);
  const leadSummary = !proposal.lead
    ? "No lead"
    : isConfirmed(proposal)
      ? money(reportedValue(proposal)) + " ✓"
      : bandFor(proposal.lead_value).short + " est.";
  const leadColor = proposal.lead ? "var(--color-accent-2-700)" : "var(--color-neutral-600)";
  const scoreText = proposal.score
    ? "★".repeat(proposal.score) + "☆".repeat(5 - proposal.score)
    : "Not evaluated";
  const scoreColor =
    (proposal.score ?? 0) >= 4
      ? "var(--color-accent-2-700)"
      : proposal.score
        ? "var(--color-accent-600)"
        : "var(--color-neutral-600)";

  return (
    <div
      className="row elev-sm"
      style={{
        display: "grid",
        gridTemplateColumns: showEdit
          ? "minmax(260px,2fr) repeat(4, minmax(96px,auto)) auto"
          : "minmax(260px,2fr) repeat(4, minmax(96px,auto))",
        gap: "var(--space-4)",
        alignItems: "center",
        padding: "var(--space-3) var(--space-4)",
      }}
    >
      <div style={{ minWidth: 0 }}>
        <a
          href={proposal.url ?? "#"}
          target="_blank"
          rel="noopener"
          style={{ fontWeight: 700, textDecoration: "none", fontSize: 15 }}
        >
          {proposal.title} ↗
        </a>
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 6, flexWrap: "wrap" }}>
          <span className={`tag ${statusTagClass(proposal)}`}>{statusLabel(proposal.status)}</span>
          {showBoost && proposal.boosted && (
            <span className="tag tag-neutral">Boosted +{proposal.boost_connects || 0}</span>
          )}
          <span className="text-muted" style={{ fontSize: 12 }}>
            {(proposal.subcategory || proposal.category) + " · " + proposal.country}
          </span>
        </div>
      </div>
      <div>
        <div className="text-muted" style={{ fontSize: 11 }}>
          Sent
        </div>
        <div style={{ fontSize: 14, whiteSpace: "nowrap" }}>{fmtDate(proposal.date_sent)}</div>
      </div>
      <div>
        <div className="text-muted" style={{ fontSize: 11 }}>
          Connects
        </div>
        <div style={{ fontSize: 14, whiteSpace: "nowrap" }}>{ref ? `${net} net` : String(spent)}</div>
        {showBoost && (
          <div style={{ fontSize: 11, color: ref ? "var(--color-accent-2-700)" : "var(--color-neutral-600)", whiteSpace: "nowrap" }}>
            {ref ? `${spent} spent · ${ref} back` : proposal.boosted ? `incl. ${proposal.boost_connects || 0} boost` : ""}
          </div>
        )}
      </div>
      <div>
        <div className="text-muted" style={{ fontSize: 11 }}>
          Lead
        </div>
        <div style={{ fontSize: 14, whiteSpace: "nowrap", color: leadColor }}>{leadSummary}</div>
      </div>
      <div>
        <div className="text-muted" style={{ fontSize: 11 }}>
          Review
        </div>
        <div style={{ fontSize: 14, whiteSpace: "nowrap", color: scoreColor }}>{scoreText}</div>
      </div>
      {showEdit && (
        <button type="button" className="btn btn-ghost btn-sm" onClick={onEdit}>
          Edit
        </button>
      )}
    </div>
  );
}
