"use client";

import { useActionState } from "react";
import { sendMagicLink, type SendLinkState } from "./actions";

const initialState: SendLinkState = { status: "idle" };

export function LoginForm({ notOnTeam }: { notOnTeam: boolean }) {
  const [state, formAction, pending] = useActionState(sendMagicLink, initialState);

  return (
    <div className="card elev-md" style={{ padding: "var(--space-6)", gap: "var(--space-3)" }}>
      {state.status === "sent" ? (
        <p className="card-body" style={{ margin: 0 }}>
          Check your email — the link signs you in for 30 days.
        </p>
      ) : (
        <form
          action={formAction}
          style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}
        >
          <div>
            <label className="field-label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoFocus
              placeholder="you@qualixsolutions.com"
              className="input"
            />
          </div>
          {(state.status === "error" || notOnTeam) && (
            <p style={{ color: "var(--color-accent-2-600)", fontSize: 13, margin: 0 }}>
              {state.message ?? "That address isn't on the Qualix team."}
            </p>
          )}
          <button type="submit" className="btn btn-primary" disabled={pending}>
            {pending ? "Sending…" : "Email me a link"}
          </button>
        </form>
      )}
    </div>
  );
}
