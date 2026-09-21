# Handoff: Qualix Bid Tracker — hosted web app

## Overview

An internal Upwork bidding tracker for Qualix Solutions. Three people use it:

| Person | Role | What they do |
| --- | --- | --- |
| Naveed Ahmed | Super admin | Sees everything, edits everything, sets monthly targets, exports all data |
| Abeer Shah Khan | Team lead | Same access as Naveed; owns the review queue — scores proposals, confirms real lead value, exports the master sheet |
| Syed Usama Ali | Bidder | Logs his own proposals and pastes his Upwork connects history. Cannot edit an entry once logged, cannot see team-wide data |

The bidder logs every proposal he sends. The team lead reviews each one after the client meeting — gives it a 1–5 quality score, a line of feedback, and the **real** deal value (which replaces the bidder's estimate everywhere). Management watches monthly targets for leads, connects spend and revenue.

The current prototype stores everything in browser localStorage, so nothing is shared between people. **That is the entire reason for this rebuild:** one hosted app, one database, three real accounts.

## About the design files

`Bid Tracker.dc.html` in this bundle is a **design reference created in HTML** — a working prototype showing the intended look, layout, copy and behavior. It is not production code to copy. Recreate these screens as React components in the Next.js app described below, using the exact tokens and measurements in this document.

Open it directly in a browser. Access codes for the prototype: super admin `QX-ADMIN-4417`, team lead `QX-LEAD-2098`, bidder `QX-BID-7365`. These codes do **not** carry over — the hosted app uses magic-link auth.

## Fidelity

**High-fidelity.** Colors, typography, spacing, radii and copy are final. Recreate the UI to match. Behavior described below is also final — the prototype's logic (connects maths, refund parsing, target resolution, value confirmation) is the specification.

---

## Target stack

- **Next.js** (App Router, TypeScript)
- **Supabase** — Postgres + Auth + Row Level Security
- **Vercel** for hosting
- **Auth: magic link** (Supabase `signInWithOtp`). No passwords. Only the three seeded email addresses can sign in; everyone else is rejected.
- Server Components for reads; Server Actions or Route Handlers for writes.

No Upwork API integration. All logging is manual.

---

## Data model

```sql
-- Roles are fixed for now (3 people). Keep the enum so a 4th bidder is a row, not a deploy.
create type user_role as enum ('super_admin', 'team_lead', 'bidder');
create type proposal_status as enum ('no_reply', 'viewed', 'replied', 'interview', 'hired');

create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text unique not null,
  full_name   text not null,
  initials    text not null,
  role        user_role not null,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

create table proposals (
  id                uuid primary key default gen_random_uuid(),
  bidder_id         uuid not null references profiles(id),
  title             text not null,
  url               text,
  date_sent         date not null,
  month             text generated always as (to_char(date_sent, 'YYYY-MM')) stored,

  category          text not null,
  subcategory       text,
  country           text not null,
  client_budget     numeric(12,2) not null default 0,

  connects          integer not null default 0,   -- base connects
  boosted           boolean not null default false,
  boost_connects    integer not null default 0,
  refunded_connects integer not null default 0,   -- set by the reconciliation flow

  status            proposal_status not null default 'no_reply',

  lead              boolean not null default false,
  lead_value        numeric(12,2) not null default 0,  -- bidder's ESTIMATE (band midpoint)
  actual_value      numeric(12,2),                     -- team lead's CONFIRMED value, null until review

  score             smallint check (score between 1 and 5),  -- null = not evaluated
  comment           text,
  reviewed_by       uuid references profiles(id),
  reviewed_at       timestamptz,

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index on proposals (bidder_id, month);
create index on proposals (month);

-- Connects refunds that could not be matched to a specific proposal.
create table refund_pool (
  month      text not null,
  bidder_id  uuid not null references profiles(id),
  connects   integer not null default 0,
  primary key (month, bidder_id)
);

-- Monthly targets. month = 'YYYY-MM' for an override, or the literal 'default'.
create table targets (
  month           text not null,
  bidder_id       uuid not null references profiles(id),
  leads_target    integer not null,
  connects_cap    integer not null,
  revenue_target  numeric(12,2) not null,
  updated_by      uuid references profiles(id),
  updated_at      timestamptz not null default now(),
  primary key (month, bidder_id)
);

-- Raw pastes, kept so a bad reconciliation can be traced.
create table connects_imports (
  id          uuid primary key default gen_random_uuid(),
  bidder_id   uuid not null references profiles(id),
  month       text not null,
  raw_text    text not null,
  applied     jsonb not null,  -- [{proposal_id, amount}] + {unassigned: n}
  created_at  timestamptz not null default now(),
  created_by  uuid not null references profiles(id)
);
```

Seed `profiles` with the three people (see Roles table above) and their real email addresses. Seed one `targets` row per bidder at month `'default'` with leads 12, connects cap 420, revenue 60000.

### Row Level Security

```sql
alter table proposals enable row level security;

-- helper
create or replace function current_role_of() returns user_role
  language sql stable as $$ select role from profiles where id = auth.uid() $$;

-- Bidders read only their own; admin/lead read all.
create policy read_proposals on proposals for select using (
  current_role_of() in ('super_admin','team_lead') or bidder_id = auth.uid()
);

-- Bidders insert only rows attributed to themselves.
create policy insert_proposals on proposals for insert with check (
  current_role_of() in ('super_admin','team_lead') or bidder_id = auth.uid()
);

-- Bidders CANNOT update. Admin/lead can update anything.
create policy update_proposals on proposals for update using (
  current_role_of() in ('super_admin','team_lead')
);
```

Apply the same shape to `targets` (admin/lead write, everyone reads their own), `refund_pool` and `connects_imports` (a bidder may write his own reconciliation, which updates `refunded_connects` — do this in a `security definer` function so the bidder's own refund import is the one exception to the no-update rule, and it may only lower connects, never touch any other column).

---

## Business logic — this is the spec, follow it exactly

### Connects maths

```
spent(p)  = connects + (boosted ? boost_connects : 0)
net(p)    = max(0, spent(p) - refunded_connects)
```

Monthly totals per bidder also add `refund_pool.connects` for that month to the refunded figure. **Net connects**, not spent, is what every KPI, progress bar and cap comparison reports.

### Lead value — estimate vs confirmed

The bidder picks a value *band* when logging; store the band's midpoint in `lead_value`.

| Band label | Stored midpoint |
| --- | --- |
| $500 – $1,000 | 750 |
| $1,000 – $5,000 | 3000 |
| $5,000 – $10,000 | 7500 |
| $10,000 – $20,000 | 15000 |
| $20,000+ | 26000 |

After the client meeting the team lead enters the real number in `actual_value`. **Everywhere a value is reported:**

```
reported_value(p) = (p.actual_value is not null) ? p.actual_value : p.lead_value
```

Rows show `$12k ✓` when confirmed, `$5–10k est.` when not. `actual_value` only applies when `lead = true`; clear it if the lead flag is turned off.

### Targets resolution

For a given month and bidder, resolve in this order and stop at the first hit:

1. `targets` row for that exact `YYYY-MM`
2. `targets` row at month `'default'`
3. Hard-coded fallback: leads 12, connects cap 420, revenue 60000

Saving from the targets dialog writes either the month row ("Save for September 2026") or the default row ("Save as default"). "Clear this month's override" deletes the month row only. Past months must keep the numbers they were judged against — never retro-apply a new default over an existing override.

### Connects history reconciliation — the refund parser

Upwork refunds connects when a boosted proposal gets outbid, when a boost expires, or when a bid is withdrawn or cancelled. The bidder pastes his whole connects history from Upwork (Settings → Connects → History) into a textarea; the app extracts refund lines and subtracts them.

Port this parser as-is (it is tested against real Upwork paste formats):

1. Split the paste on newlines, trim, drop empties.
2. **Strip the leading date column first**, then strip any bare 4-digit year. Without this, `Sep 09, 2026` is misread as an amount. Date forms to match: `09/14/2026`, `2026-09-14`, `Sep 14, 2026`, `September 14th 2026`, `14 Sep 2026`.
3. A line is a refund if it matches `/refund|refunded|return|returned|expire|expired|unused|outbid|out-bid|withdraw|cancel|reversal|credited/i` **or** carries an explicitly signed positive number.
4. Amount:
   - If a signed number is present (`+12`, `−8`), use it; positive means a refund.
   - Otherwise prefer a number adjacent to the word "connect(s)" (`12 connects`, `connects returned: 12`).
   - Otherwise split the line into columns on tabs or 2+ spaces, **drop the last column if it is a bare number** (that is the running balance), and take the last remaining integer.
5. Keep only entries with a positive amount, rounded to a whole number.
6. Build a description by joining the remaining columns with ` · `, minus amounts and the balance column.

**Matching to proposals:** lowercase the description, strip non-alphanumerics, keep words longer than 3 characters. For each of the bidder's proposals in the selected month, count how many of those words appear in the proposal title. Best score wins; **require at least 2 matching words**, otherwise the refund is unassigned.

Show the parsed result as a preview list before applying — amount, description, and either the matched job title or an "Unassigned" tag. On apply: matched amounts increase `refunded_connects` on their proposal, capped at `spent(p)`; unassigned amounts go into `refund_pool` for that month and bidder. Store the raw paste in `connects_imports`.

### Metrics

Per month, per bidder (and summed for the team):

| Metric | Formula |
| --- | --- |
| Proposals sent | count |
| Viewed ratio | `status != 'no_reply'` / total |
| Leads | count where `lead` |
| Lead value | sum of `reported_value(p)` over leads |
| Confirmed value | sum over leads where `actual_value` is not null |
| Net connects | sum of `net(p)` + month's refund pool |
| Pending review | count where `score is null` |
| Quality 4★+ | count where `score >= 4`, shown against the evaluated count |
| Avg score | mean of non-null scores |
| Connects per lead | net connects / leads |
| Pace | "Behind pace" when leads are under 60% of target and at least one proposal exists; "Target met" at 100%+; otherwise "On pace" |

---

## Screens

All screens share a sticky pill-shaped header: logo slot (44px, 13px radius) + brand lockup ("Qualix Solutions" 17px Sora 700, below it a 4px sage dot and "BID TRACKER" 9px, 600, `letter-spacing: 0.2em`, uppercase, `--color-neutral-600`), then the view tabs in a pill rail, then a month stepper (`‹ September 2026 ›`), then the user chip (name, role, 32px avatar circle, power icon to sign out). Header sits on `--color-surface` with `--shadow-md`, fully rounded (`999px`), max width 1240px.

### 1. Sign in
Replaces the prototype's access-code screen. Brand lockup, `h1` "Enter your code" → change to **"Sign in"**, one email field, one primary button "Email me a link". After submit show "Check your email — the link signs you in for 30 days." Reject any address not in `profiles` with "That address isn't on the Qualix team."

### 2. Dashboard — super admin + team lead only
- Header block: kicker `<ROLE> · SEPTEMBER 2026`, `h1` "Team performance" at 58px, and on the right a summary sentence plus three buttons: **Download all data** (primary), **This month only**, **Edit targets**.
- **KPI row** — auto-fit grid, `minmax(215px, 1fr)`, gap `--space-3`. Six cards: Proposals sent, Leads generated, Viewed ratio, Net connects, Lead value, Quality 4★+. Each card: kicker label, a 40px SVG donut showing the percentage (`r=16`, `stroke-width=5`, `pathLength=100`, rotated −90°, track `--color-neutral-300`), the value at 38px Sora, and a sub-line of detail.
- **Bidders leaderboard** — one clickable row per bidder, ranked by leads against target. Row holds: 48px avatar, name at 19px, a pace tag, a summary line (`N proposals · X% viewed · Y% conversion · Z rated 4★+`), then three labelled progress bars (Leads, Net connects, Lead value — 8px tall, fully rounded), then a pending-review tag and a `›` chevron. Clicking opens that bidder's profile.
- **Three cards below**: Review backlog (with "Open review queue" button), Boosted & refunds (with "Reconcile connects"), Month pacing.

### 3. Bidder workspace
The only view a bidder can reach. Admin/lead also get it, with a bidder-picker pill row on top.

- `h1` is the bidder's name. Sub-line: month, proposal count, leads, awaiting review.
- **Five target cards** (same donut treatment): Viewed ratio, Leads this month, Net connects, Lead value, Quality 4★+.
- **Toolbar**: "Paste connects history", "Download all data" (admin/lead only), "+ Log proposal" (primary).
- **Filter bar** in a rounded pill: search input, status dropdown, and four toggle chips — Leads only, Boosted, 4★+ quality, Not evaluated.
- **Proposal rows**: grid `minmax(260px,2fr) repeat(4, minmax(96px,auto)) auto`. Left cell is the job title as an external link (`↗`) with status tag, boost tag and `subcategory · country` beneath. Then columns for Sent, Connects (net, with `spent · back` underneath in sage when refunded), Lead, Review. Edit button only for admin/lead.
- Empty state: a centered card, different copy for "no proposals this month" vs "nothing matches these filters".

### 4. Log / edit proposal — modal
Two-column grid. Job title and Upwork link span full width. Then connects spent, date sent, a **boost block** on a tinted panel (toggle "⚡ Boosted proposal" / "○ Standard proposal", plus boost connects and refunded fields when on), client budget, country, Upwork category, subcategory (options depend on category), response status, bidder (a locked read-only field for a bidder, a dropdown for admin/lead), lead value band, and a lead toggle ("● Lead generated" / "○ No lead yet"). Actions: Cancel, and Log proposal / Save changes.

Category → subcategory map, statuses, countries and value bands are all in the prototype's logic class — copy them verbatim.

### 5. Review queue — super admin + team lead
- Filter row: **Not evaluated** / **4★+ quality** / **All this month**, a bidder dropdown, and a count.
- One card per proposal: bidder and date kicker, job title as a 22px link, tags for net connects, budget, country, status, lead (showing "confirmed" or "est."), and boost.
- Right side: a 1–5 star rating in a rounded pill; stars fill with `--color-accent`, scale 1.15 on hover.
- **Confirmed value panel** (tinted, rounded): a "Confirmed lead value ($)" number input, five quick band buttons, and a note that changes with state — tells you to mark it as a lead first if it isn't one, or reports "Reporting $12k instead of the $7.5k estimate."
- Bottom row: feedback text input, "Edit entry", and a save button whose label is "Save evaluation" when dirty, "Saved" when clean, "Rate to save" when unscored. **Saving requires a score.** Ratings and comments are drafts until saved.

### 6. Bidder profile — super admin + team lead
Back link, 88px avatar, name at 52px. Seven stat cards (Proposals, Viewed ratio, Leads, Lead value, Avg review score, Quality 4★+, Connects per lead). A three-month leads bar chart — bars `max-width: 90px`, `border-radius: 14px 14px 6px 6px`, current month in `--color-accent`, prior months in `--color-accent-300`. Then that month's proposal rows, read-only.

### 7. Targets dialog — super admin + team lead
One panel per bidder: avatar, name, a tag reading "Set for this month" or "Using default", and three number fields (leads target, connects cap, revenue target). Actions: "Clear this month's override" (only when one exists), Cancel, "Save as default", "Save for September 2026" (primary).

### 8. Connects reconciliation dialog
Explanatory paragraph, a large textarea for the paste, a "Scan history" button and a summary line ("3 refund lines found · 30 connects returned"). Below, the parsed preview list. Actions: Cancel, and "Subtract 30 connects" (primary, label carries the total).

---

## Exports

Two buttons; both produce CSV with a UTF-8 BOM (`\ufeff`) so Excel opens them cleanly. `Download all data` is the one Abeer uses to keep everything in one sheet.

- **Download all data** — every month, every bidder, sorted by month + bidder + date. Appends a second block at the bottom listing unassigned connect refunds by month and bidder.
- **This month only** — same columns, current month.

Columns, in order:

```
Month, Bidder, Date sent, Job title, Upwork link, Category, Subcategory, Country,
Client budget, Connects (base), Boosted, Boost connects, Connects spent,
Connects refunded, Net connects, Status, Viewed, Lead generated,
Lead value range (est.), Estimated value, Confirmed value (after review),
Reported value, Value confirmed, Evaluation score, High quality (4★+), Evaluation comments
```

Every field quoted, `"` escaped by doubling, `\r\n` line endings.

> If the team would rather work in real Excel, swap the CSV writer for `exceljs` and emit a styled `.xlsx` — same columns.

---

## Design tokens

Dark theme over the Organic design system's component layer.

```css
--color-bg: #0a0a0a;
--color-surface: #16171a;
--color-text: #f4f4f2;
--color-on-accent: #ffffff;
--color-divider: rgba(255,255,255,0.14);

--color-neutral-100: #131417;  --color-neutral-200: #1f2024;
--color-neutral-300: #2b2d32;  --color-neutral-400: #3b3e45;
--color-neutral-500: #5a5e67;  --color-neutral-600: #8b9099;
--color-neutral-700: #b3b8c0;  --color-neutral-800: #d5d8dd;
--color-neutral-900: #eef0f3;

--color-accent: #3b6fff;       /* blue — primary actions, active states */
--color-accent-100: #101a33;   --color-accent-200: #16234a;
--color-accent-300: #1d3370;   --color-accent-400: #2b4fb8;
--color-accent-500: #3b6fff;   --color-accent-600: #5c88ff;
--color-accent-700: #9bb6ff;   --color-accent-800: #c3d3ff;
--color-accent-900: #e4ebff;

--color-accent-2: #2fb894;     /* sage/teal — leads, confirmed values, positive */
--color-accent-2-100: #0c2620; --color-accent-2-200: #103a2f;
--color-accent-2-300: #17594a; --color-accent-2-400: #1f8a70;
--color-accent-2-500: #2fb894; --color-accent-2-600: #46d3ad;
--color-accent-2-700: #86ecd0; --color-accent-2-800: #b6f3e1;
--color-accent-2-900: #ddf9f0;

--shadow-sm: 0 1px 2px rgba(0,0,0,0.5);
--shadow-md: 0 6px 20px rgba(0,0,0,0.55);
--shadow-lg: 0 18px 46px rgba(0,0,0,0.65);
```

**Type** — headings in **Sora** (600/700, `letter-spacing: -0.03em`); body in **Figtree**. Scale in use: page `h1` 58px, section `h2` 36px, card titles 24px, KPI numbers 38px (34px in the bidder view), body 15px, meta 12–13px, kickers 10–11px uppercase with `0.16em` tracking.

**Spacing** — the Organic `--space-*` scale (1.10× density). `--space-2` ≈ 9px, `--space-3` ≈ 13px, `--space-4` ≈ 18px, `--space-6` ≈ 26px, `--space-8` ≈ 35px.

**Radius** — `--radius-lg` 16px for cards and panels, `calc(var(--radius-lg) * 1.1–1.15)` for list rows, `999px` for every button, input, tag and the header bar. No sharp corners anywhere.

**Focus** — `:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 2px; }`. Never the browser default.

**Decoration** — two large blurred circles behind the page: 620px at top-right in `--color-accent-200` at 0.5 opacity, 480px at mid-left in `--color-accent-2-200` at 0.45. `pointer-events: none`.

**Icons** — Lucide, `stroke-width: 2.75`.

---

## Assets

- **Logo** — the prototype uses an empty drop-in slot. Supply the real Qualix Solutions mark as SVG; it renders at 40–44px with a 13–14px radius.
- Fonts load from Google Fonts: Sora (500/600/700) and Figtree.
- No other imagery.

---

## Build order

1. Supabase project, schema above, RLS policies, seed the three profiles.
2. Magic-link auth + a middleware guard that redirects unauthenticated users and resolves the role once per request.
3. Bidder workspace + the log-proposal modal — this is the only screen one of your three users ever sees, so it has to be right first.
4. Review queue with scoring and confirmed value.
5. Dashboard, leaderboard, profile.
6. Targets dialog.
7. Connects reconciliation (port the parser and its matching rules carefully; write unit tests against a real Upwork paste).
8. CSV exports.

## Files in this bundle

- `README.md` — this document
- `Bid Tracker.dc.html` — the high-fidelity design reference; open in a browser, sign in with the codes above
- `schema.sql` — the SQL from this document, ready to run against Supabase
