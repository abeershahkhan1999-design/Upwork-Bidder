import { Suspense } from "react";
import { requireProfile } from "@/lib/auth";
import { Header } from "@/components/header";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile();

  return (
    <div style={{ position: "relative", minHeight: "100vh" }}>
      <Suspense fallback={<div style={{ height: 72 }} />}>
        <Header profile={profile} />
      </Suspense>
      <div style={{ position: "relative", maxWidth: 1240, margin: "0 auto", padding: "var(--space-6) var(--space-6) calc(var(--space-8) * 2)" }}>
        {children}
      </div>
    </div>
  );
}
