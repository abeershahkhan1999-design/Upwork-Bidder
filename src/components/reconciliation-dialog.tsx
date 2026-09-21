"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { matchEntry, parseConnects, type ParsedRefundEntry } from "@/lib/business-logic";
import { applyConnectsRefunds } from "@/app/actions/connects";

interface PoolProposal {
  id: string;
  title: string;
}

export function ReconciliationDialog({
  bidderId,
  bidderName,
  monthKey,
  pool,
  onClose,
}: {
  bidderId: string;
  bidderName: string;
  monthKey: string;
  pool: PoolProposal[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [entries, setEntries] = useState<(ParsedRefundEntry & { pid: string | null; matchTitle: string | null })[] | null>(
    null
  );
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const totalFound = useMemo(() => (entries ?? []).reduce((a, e) => a + e.amount, 0), [entries]);

  function scan() {
    const parsed = parseConnects(text).map((e) => {
      const m = matchEntry(e, pool);
      return { ...e, pid: m ? m.id : null, matchTitle: m ? m.title : null };
    });
    setEntries(parsed);
  }

  function apply() {
    if (!entries || !entries.length) {
      onClose();
      return;
    }
    setError(null);
    const byId = new Map<string, number>();
    let unassigned = 0;
    for (const e of entries) {
      if (e.pid) byId.set(e.pid, (byId.get(e.pid) ?? 0) + e.amount);
      else unassigned += e.amount;
    }
    const matches = Array.from(byId.entries()).map(([proposal_id, amount]) => ({ proposal_id, amount }));

    startTransition(async () => {
      try {
        await applyConnectsRefunds({ bidderId, monthKey, matches, unassigned, raw: text });
        router.refresh();
        onClose();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't apply this reconciliation.");
      }
    });
  }

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div
        className="dialog"
        style={{ width: "min(780px, 100%)", maxHeight: "90vh", overflow: "auto", padding: "var(--space-8)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ fontFamily: "var(--font-heading)", fontSize: 30, fontWeight: 600, marginBottom: "var(--space-3)" }}>
          Connects history — refunds
        </div>
        <p className="card-body" style={{ margin: "0 0 var(--space-3)", maxWidth: "62ch" }}>
          Paste your whole Upwork connects history (Settings → Connects → History). Every returned
          line — refunds on boosted proposals you were outbid on, expired boosts, withdrawn or
          cancelled bids — is read and subtracted from connects spent.
        </p>
        <div>
          <label className="field-label">Paste connects history for {bidderName}</label>
          <textarea
            className="textarea"
            rows={8}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={"Sep 14, 2026\tBoosted proposal refund — Shopify subscription app\t+12\t148"}
          />
        </div>
        <div
          style={{
            display: "flex",
            gap: "var(--space-2)",
            alignItems: "center",
            flexWrap: "wrap",
            margin: "var(--space-3) 0",
          }}
        >
          <button type="button" className="btn btn-secondary" onClick={scan}>
            Scan history
          </button>
          <span className="text-muted" style={{ fontSize: 13 }}>
            {entries
              ? `${entries.length} refund line${entries.length === 1 ? "" : "s"} found · ${totalFound} connects returned`
              : ""}
          </span>
        </div>
        {entries && entries.length > 0 && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
              maxHeight: 280,
              overflow: "auto",
              padding: "var(--space-3)",
              borderRadius: "var(--radius-lg)",
              background: "var(--color-neutral-100)",
            }}
          >
            {entries.map((e, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: "var(--space-3)",
                  alignItems: "center",
                  fontSize: 13,
                  padding: "8px 10px",
                  borderRadius: 12,
                  background: "var(--color-surface)",
                }}
              >
                <span style={{ fontFamily: "var(--font-heading)", color: "var(--color-accent-2-700)", minWidth: 48 }}>
                  +{e.amount}
                </span>
                <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {e.desc}
                </span>
                <span className={`tag ${e.matchTitle ? "tag-accent-2" : "tag-neutral"}`}>
                  {e.matchTitle ?? "Unassigned"}
                </span>
              </div>
            ))}
          </div>
        )}
        {error && (
          <p style={{ color: "var(--color-accent-2-600)", fontSize: 13, marginTop: "var(--space-3)" }}>{error}</p>
        )}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-2)", marginTop: "var(--space-6)" }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" disabled={pending || !entries} onClick={apply}>
            {pending ? "Applying…" : `Subtract ${totalFound} connects`}
          </button>
        </div>
      </div>
    </div>
  );
}
