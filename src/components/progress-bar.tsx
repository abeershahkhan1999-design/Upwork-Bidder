export function ProgressBar({
  label,
  valueLabel,
  pct,
  color,
}: {
  label: string;
  valueLabel: string;
  pct: number;
  color: string;
}) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
        <span className="text-muted">{label}</span>
        <span style={{ fontWeight: 600 }}>{valueLabel}</span>
      </div>
      <div className="progress-track">
        <div
          className="progress-fill"
          style={{ width: `${Math.max(0, Math.min(100, pct))}%`, background: color }}
        />
      </div>
    </div>
  );
}
