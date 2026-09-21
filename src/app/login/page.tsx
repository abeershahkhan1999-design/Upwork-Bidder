import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const notOnTeam = error === "not-on-team";
  const linkExpired = error === "link-expired";

  return (
    <div
      style={{
        position: "relative",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "var(--space-8) var(--space-6)",
      }}
    >
      <div style={{ width: "min(420px, 100%)" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 13,
            marginBottom: "var(--space-8)",
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 13,
              background: "var(--color-accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "var(--font-heading)",
              fontWeight: 700,
              color: "var(--color-on-accent)",
            }}
          >
            Q
          </div>
          <div>
            <div style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 17 }}>
              Qualix Solutions
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
              <span
                style={{
                  width: 4,
                  height: 4,
                  borderRadius: "50%",
                  background: "var(--color-accent-2)",
                }}
              />
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 600,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color: "var(--color-neutral-600)",
                }}
              >
                Bid Tracker
              </span>
            </div>
          </div>
        </div>

        <h1 style={{ fontSize: 40, lineHeight: 1.02, marginBottom: "var(--space-2)" }}>
          Sign in
        </h1>
        <p style={{ margin: "0 0 var(--space-4)", color: "var(--color-neutral-700)" }}>
          Enter your Qualix email — we&apos;ll send a link that signs you in. No passwords.
        </p>

        {linkExpired && (
          <p style={{ color: "var(--color-accent-2-600)", fontSize: 13, margin: "0 0 var(--space-3)" }}>
            That link expired. Request a new one below.
          </p>
        )}
        <LoginForm notOnTeam={notOnTeam} />
      </div>
    </div>
  );
}
