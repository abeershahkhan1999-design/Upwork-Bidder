"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Power } from "lucide-react";
import { signOut } from "@/app/actions/auth";
import { ROLE_LABELS } from "@/lib/roles";
import { monthKeyOf, monthLabel, shiftMonth } from "@/lib/business-logic";
import type { UserRole } from "@/lib/database.types";

export function Header({
  profile,
}: {
  profile: { full_name: string; initials: string; role: UserRole };
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const monthParam = searchParams.get("month");
  const monthKey = monthParam && /^\d{4}-\d{2}$/.test(monthParam) ? monthParam : monthKeyOf(new Date());

  const tabs: { href: string; label: string }[] =
    profile.role === "bidder"
      ? [{ href: "/bidder", label: "My proposals" }]
      : [
          { href: "/dashboard", label: "Dashboard" },
          { href: "/bidder", label: "Bidders" },
          { href: "/review", label: "Review queue" },
        ];

  function monthHref(delta: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("month", shiftMonth(monthKey, delta));
    return `${pathname}?${params.toString()}`;
  }

  return (
    <div style={{ position: "sticky", top: 0, zIndex: 20, padding: "var(--space-4) var(--space-6) var(--space-2)" }}>
      <div
        style={{
          maxWidth: 1240,
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          gap: "var(--space-4)",
          flexWrap: "wrap",
          padding: "10px 10px 10px var(--space-4)",
          borderRadius: 999,
          background: "var(--color-surface)",
          boxShadow: "var(--shadow-md)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 11, marginRight: "var(--space-4)" }}>
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
              flexShrink: 0,
            }}
          >
            Q
          </div>
          <div>
            <div style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 17, lineHeight: 1, whiteSpace: "nowrap" }}>
              Qualix Solutions
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
              <span style={{ width: 4, height: 4, borderRadius: "50%", background: "var(--color-accent-2)" }} />
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

        <nav style={{ display: "flex", gap: 4, padding: 4, borderRadius: 999, background: "var(--color-neutral-200)" }}>
          {tabs.map((t) => {
            const active = pathname.startsWith(t.href);
            return (
              <Link
                key={t.href}
                href={t.href}
                style={{
                  padding: "8px 16px",
                  borderRadius: 999,
                  fontSize: 13,
                  fontWeight: 600,
                  background: active ? "var(--color-accent)" : "transparent",
                  color: active ? "var(--color-on-accent)" : "var(--color-neutral-700)",
                  whiteSpace: "nowrap",
                }}
              >
                {t.label}
              </Link>
            );
          })}
        </nav>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)",
            marginLeft: "var(--space-2)",
            fontSize: 14,
            fontWeight: 600,
            whiteSpace: "nowrap",
          }}
        >
          <Link href={monthHref(-1)} className="btn btn-ghost btn-sm" aria-label="Previous month">
            ‹
          </Link>
          <span>{monthLabel(monthKey)}</span>
          <Link href={monthHref(1)} className="btn btn-ghost btn-sm" aria-label="Next month">
            ›
          </Link>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginLeft: "auto" }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: "var(--color-accent-300)",
              color: "var(--color-accent-800)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {profile.initials}
          </div>
          <div style={{ lineHeight: 1.2 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{profile.full_name}</div>
            <div style={{ fontSize: 11, color: "var(--color-neutral-600)" }}>{ROLE_LABELS[profile.role]}</div>
          </div>
          <form action={signOut}>
            <button type="submit" className="btn btn-ghost btn-sm" aria-label="Sign out" style={{ padding: 8 }}>
              <Power size={16} strokeWidth={2.75} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
