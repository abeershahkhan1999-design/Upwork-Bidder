"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { monthLabel } from "@/lib/business-logic";
import { clearTargetOverride, saveTargets } from "@/app/actions/targets";

export interface TargetFormBidder {
  id: string;
  name: string;
  initials: string;
  leadsTarget: number;
  connectsCap: number;
  revenueTarget: number;
  overridden: boolean;
}

export function TargetsDialog({
  monthKey,
  bidders,
  onClose,
}: {
  monthKey: string;
  bidders: TargetFormBidder[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(
    Object.fromEntries(
      bidders.map((b) => [
        b.id,
        { leads: String(b.leadsTarget), connects: String(b.connectsCap), revenue: String(b.revenueTarget) },
      ])
    )
  );

  const anyOverridden = bidders.some((b) => b.overridden);

  function update(id: string, key: "leads" | "connects" | "revenue", value: string) {
    setForm((f) => ({ ...f, [id]: { ...f[id], [key]: value } }));
  }

  function rowsFromForm() {
    return bidders.map((b) => ({
      bidder_id: b.id,
      leads_target: Number(form[b.id].leads) || 0,
      connects_cap: Number(form[b.id].connects) || 0,
      revenue_target: Number(form[b.id].revenue) || 0,
    }));
  }

  function save(scope: "month" | "default") {
    setError(null);
    startTransition(async () => {
      try {
        await saveTargets({ scope, monthKey, rows: rowsFromForm() });
        router.refresh();
        onClose();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't save targets.");
      }
    });
  }

  function clearOverride() {
    setError(null);
    startTransition(async () => {
      try {
        await clearTargetOverride(
          monthKey,
          bidders.map((b) => b.id)
        );
        router.refresh();
        onClose();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't clear the override.");
      }
    });
  }

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div
        className="dialog"
        style={{ width: "min(700px, 100%)", maxHeight: "90vh", overflow: "auto", padding: "var(--space-8)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ fontFamily: "var(--font-heading)", fontSize: 30, fontWeight: 600, marginBottom: "var(--space-2)" }}>
          Targets — {monthLabel(monthKey)}
        </div>
        <p className="card-body" style={{ margin: "0 0 var(--space-4)", maxWidth: "58ch" }}>
          Set each bidder&apos;s goals for this month. Save for the month when a target is a
          one-off; save as default when it should carry into every month from here on.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          {bidders.map((b) => (
            <div
              key={b.id}
              style={{
                padding: "var(--space-4)",
                borderRadius: "var(--radius-lg)",
                background: "var(--color-neutral-100)",
                display: "flex",
                flexDirection: "column",
                gap: "var(--space-3)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: "50%",
                    flex: "none",
                    display: "grid",
                    placeItems: "center",
                    fontSize: 12,
                    fontFamily: "var(--font-heading)",
                    background: "var(--color-accent)",
                    color: "var(--color-on-accent)",
                  }}
                >
                  {b.initials}
                </span>
                <span style={{ fontFamily: "var(--font-heading)", fontSize: 17 }}>{b.name}</span>
                <span className={`tag ${b.overridden ? "tag-accent" : "tag-neutral"}`} style={{ marginLeft: "auto" }}>
                  {b.overridden ? "Set for this month" : "Using default"}
                </span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "var(--space-3)" }}>
                <div>
                  <label className="field-label">Leads target</label>
                  <input
                    className="input"
                    type="number"
                    value={form[b.id].leads}
                    onChange={(e) => update(b.id, "leads", e.target.value)}
                  />
                </div>
                <div>
                  <label className="field-label">Connects cap</label>
                  <input
                    className="input"
                    type="number"
                    value={form[b.id].connects}
                    onChange={(e) => update(b.id, "connects", e.target.value)}
                  />
                </div>
                <div>
                  <label className="field-label">Revenue target ($)</label>
                  <input
                    className="input"
                    type="number"
                    value={form[b.id].revenue}
                    onChange={(e) => update(b.id, "revenue", e.target.value)}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {error && (
          <p style={{ color: "var(--color-accent-2-600)", fontSize: 13, marginTop: "var(--space-3)" }}>{error}</p>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-2)", marginTop: "var(--space-6)", flexWrap: "wrap" }}>
          {anyOverridden && (
            <button type="button" className="btn btn-ghost" style={{ marginRight: "auto" }} disabled={pending} onClick={clearOverride}>
              Clear this month&apos;s override
            </button>
          )}
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={pending}>
            Cancel
          </button>
          <button type="button" className="btn btn-secondary" disabled={pending} onClick={() => save("default")}>
            Save as default
          </button>
          <button type="button" className="btn btn-primary" disabled={pending} onClick={() => save("month")}>
            {pending ? "Saving…" : `Save for ${monthLabel(monthKey)}`}
          </button>
        </div>
      </div>
    </div>
  );
}
