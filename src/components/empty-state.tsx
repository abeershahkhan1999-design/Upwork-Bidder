export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div
      className="card elev-sm"
      style={{
        padding: "var(--space-8)",
        textAlign: "center",
        gap: "var(--space-3)",
        alignItems: "center",
      }}
    >
      <div className="card-title">{title}</div>
      <p className="card-body" style={{ maxWidth: "44ch" }}>
        {body}
      </p>
      {action}
    </div>
  );
}
