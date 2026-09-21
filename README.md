# Qualix Bid Tracker

Internal Upwork bidding tracker for Qualix Solutions — one hosted app, one
Supabase database, three real accounts (super admin, team lead, bidder).
Built from the design handoff in `design_handoff_bid_tracker/` (see that
bundle's `README.md` for the full product spec this implements).

## Stack

- Next.js 16 (App Router, TypeScript, Tailwind v4)
- Supabase — Postgres + Auth (magic link) + Row Level Security
- Deploy target: Vercel

## Setup

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the SQL editor — it creates the tables,
   RLS policies, and the `apply_connects_refunds` function.
3. In Supabase Auth, invite the three team members (or let them sign in once
   via magic link — `shouldCreateUser: false` means an `auth.users` row must
   already exist before their `profiles` row is inserted). Then insert their
   `profiles` rows, mapping each to their `auth.users` id:

   ```sql
   insert into profiles (id, email, full_name, initials, role) values
     ('<auth-uuid>', 'naveed@qualixsolutions.com', 'Naveed Ahmed',    'NA', 'super_admin'),
     ('<auth-uuid>', 'abeer@qualixsolutions.com',  'Abeer Shah Khan', 'AK', 'team_lead'),
     ('<auth-uuid>', 'usama@qualixsolutions.com',  'Syed Usama Ali',  'SU', 'bidder');

   insert into targets (month, bidder_id, leads_target, connects_cap, revenue_target)
     select 'default', id, 12, 420, 60000 from profiles where role = 'bidder';
   ```

4. Copy `.env.local.example` to `.env.local` and fill in your Supabase project
   URL and anon key.
5. `npm install && npm run dev`.

## Structure

- `src/lib/business-logic.ts` — the spec: connects maths, lead value
  estimate/confirmed resolution, targets resolution, the connects-history
  refund parser and matcher, CSV export. Pure functions, no I/O — ported
  from the design prototype's logic class.
- `src/lib/data.ts` — Supabase reads (RLS-scoped to the signed-in user).
- `src/app/actions/*` — Server Actions for writes (proposals, review scoring,
  targets, connects reconciliation). All RLS-scoped; admin/lead-only actions
  also check the caller's role server-side.
- `src/proxy.ts` (+ `src/lib/supabase/proxy.ts`) — Next 16's proxy (formerly
  middleware): refreshes the Supabase session, rejects anyone not in
  `profiles`, and keeps bidders off `/dashboard`, `/review`, `/profile`.
- `src/app/(app)/*` — the five authenticated screens: bidder workspace,
  dashboard, review queue, bidder profile, plus the log/edit proposal,
  targets, and connects-reconciliation dialogs as client components under
  `src/components/`.
- `src/app/api/export/route.ts` — CSV export (`?scope=all|month`), BOM-prefixed
  for Excel.

## Notes

- Auth is magic-link only, restricted to the three seeded emails — the login
  action checks `profiles` before calling `signInWithOtp`, and the proxy
  signs out anyone authenticated but not (or no longer) an active profile.
- Bidders can log proposals but never edit one once logged (enforced by RLS
  `update_proposals`, and again in the UI). Their own connects-refund import
  is the one exception, applied through the `apply_connects_refunds`
  `security definer` function so it can only lower `refunded_connects`.
