import { Donut } from "./donut";

export function KpiCard({
  label,
  value,
  pct,
  sub,
  color,
  bg,
  valueSize = 38,
}: {
  label: string;
  value: string;
  pct: number;
  sub: string;
  color: string;
  bg?: string;
  valueSize?: number;
}) {
  return (
    <div
      className="card elev-sm"
      style={{ padding: "var(--space-4)", gap: "var(--space-3)", background: bg }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-2)" }}>
        <span className="card-kicker">{label}</span>
        <Donut pct={pct} color={color} />
      </div>
      <div style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: valueSize, lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontSize: 13, color: "var(--color-neutral-600)" }}>{sub}</div>
    </div>
  );
}
