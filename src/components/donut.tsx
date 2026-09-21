export function Donut({ pct, color, size = 40 }: { pct: number; color: string; size?: number }) {
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" style={{ flexShrink: 0 }}>
      <circle
        cx="20"
        cy="20"
        r="16"
        fill="none"
        stroke="var(--color-neutral-300)"
        strokeWidth="5"
      />
      <circle
        cx="20"
        cy="20"
        r="16"
        fill="none"
        stroke={color}
        strokeWidth="5"
        strokeLinecap="round"
        pathLength={100}
        strokeDasharray={`${clamped} 100`}
        transform="rotate(-90 20 20)"
      />
    </svg>
  );
}
