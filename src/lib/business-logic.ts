// Port of the design prototype's logic class (`Bid Tracker.dc.html`). This is
// the spec — keep it byte-for-byte equivalent to the prototype's behavior,
// only adapted from prototype fields (camelCase, in-memory) to the Postgres
// schema (snake_case, `Proposal` rows from Supabase).

import type { ProposalStatus } from "@/lib/database.types";

export interface Proposal {
  id: string;
  bidder_id: string;
  title: string;
  url: string | null;
  date_sent: string;
  month: string;
  category: string;
  subcategory: string | null;
  country: string;
  client_budget: number;
  connects: number;
  boosted: boolean;
  boost_connects: number;
  refunded_connects: number;
  status: ProposalStatus;
  lead: boolean;
  lead_value: number;
  actual_value: number | null;
  score: number | null;
  comment: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export const CATEGORIES = [
  "Web, Mobile & Software Dev",
  "Design & Creative",
  "Data Science & Analytics",
  "IT & Networking",
  "Sales & Marketing",
  "Admin Support",
  "Engineering & Architecture",
  "Writing",
  "Accounting & Consulting",
] as const;

export const SUBCATEGORIES: Record<string, string[]> = {
  "Web, Mobile & Software Dev": [
    "Web Development",
    "Mobile Development",
    "Ecommerce Development",
    "Game Development",
    "QA & Testing",
    "Scripts & Utilities",
    "Desktop Software",
    "Product Management",
  ],
  "Design & Creative": [
    "Web & Mobile Design",
    "Brand Identity & Strategy",
    "Graphic Design",
    "Video Production",
    "Motion Graphics",
    "Illustration",
    "Presentation Design",
  ],
  "Data Science & Analytics": [
    "Data Analysis & Visualization",
    "Data Extraction / ETL",
    "Machine Learning",
    "AI & Deep Learning",
    "Data Mining & Management",
    "Experimentation & Testing",
  ],
  "IT & Networking": [
    "Database Administration",
    "DevOps & Solution Architecture",
    "Information Security",
    "Network Administration",
    "Systems Engineering",
    "Cloud Migration",
  ],
  "Sales & Marketing": [
    "Search Engine Optimization",
    "Marketing Automation",
    "Lead Generation",
    "Social Media Marketing",
    "Email Marketing",
    "Paid Advertising",
    "Market Research",
  ],
  "Admin Support": [
    "Virtual Assistance",
    "Data Entry",
    "Project Management",
    "Transcription",
    "Customer Service",
  ],
  "Engineering & Architecture": [
    "CAD & 3D Modeling",
    "Electrical Engineering",
    "Mechanical Engineering",
    "Interior Design",
    "Civil & Structural Engineering",
  ],
  Writing: [
    "Content Writing",
    "Copywriting",
    "Technical Writing",
    "Editing & Proofreading",
    "UX Writing",
  ],
  "Accounting & Consulting": [
    "Bookkeeping",
    "Financial Analysis & Modeling",
    "Management Consulting",
    "HR Administration",
    "Tax Preparation",
  ],
};

export const COUNTRIES = [
  "United States",
  "United Kingdom",
  "Canada",
  "Australia",
  "Germany",
  "Netherlands",
  "Ireland",
  "France",
  "Switzerland",
  "Sweden",
  "Norway",
  "Denmark",
  "Spain",
  "Italy",
  "Poland",
  "United Arab Emirates",
  "Saudi Arabia",
  "Qatar",
  "Israel",
  "Singapore",
  "Hong Kong",
  "Japan",
  "New Zealand",
  "South Africa",
  "India",
  "Brazil",
  "Mexico",
] as const;

export const STATUS_OPTIONS: { value: ProposalStatus; label: string }[] = [
  { value: "no_reply", label: "No reply" },
  { value: "viewed", label: "Viewed" },
  { value: "replied", label: "Replied" },
  { value: "interview", label: "Interview" },
  { value: "hired", label: "Hired" },
];

export function statusLabel(s: ProposalStatus): string {
  return STATUS_OPTIONS.find((o) => o.value === s)?.label ?? s;
}

export interface ValueBand {
  label: string;
  short: string;
  mid: number;
  max: number;
}

export const RANGES: ValueBand[] = [
  { label: "$500 – $1,000", short: "$0.5–1k", mid: 750, max: 1000 },
  { label: "$1,000 – $5,000", short: "$1–5k", mid: 3000, max: 5000 },
  { label: "$5,000 – $10,000", short: "$5–10k", mid: 7500, max: 10000 },
  { label: "$10,000 – $20,000", short: "$10–20k", mid: 15000, max: 20000 },
  { label: "$20,000+", short: "$20k+", mid: 26000, max: Infinity },
];

export function bandFor(value: number): ValueBand {
  return RANGES.find((r) => value <= r.max) ?? RANGES[0];
}

export const DEFAULT_TARGETS = {
  leadsTarget: 12,
  connectsCap: 420,
  revenueTarget: 60000,
};

// ── connects maths ──────────────────────────────────────────────────────
export function spentOf(p: Pick<Proposal, "connects" | "boosted" | "boost_connects">): number {
  return (Number(p.connects) || 0) + (p.boosted ? Number(p.boost_connects) || 0 : 0);
}

export function netOf(
  p: Pick<Proposal, "connects" | "boosted" | "boost_connects" | "refunded_connects">
): number {
  return Math.max(0, spentOf(p) - (Number(p.refunded_connects) || 0));
}

// ── lead value: estimate vs confirmed ───────────────────────────────────
export function isConfirmed(p: Pick<Proposal, "actual_value">): boolean {
  return p.actual_value != null;
}

export function reportedValue(p: Pick<Proposal, "actual_value" | "lead_value">): number {
  return isConfirmed(p) ? Number(p.actual_value) || 0 : Number(p.lead_value) || 0;
}

// ── formatting ───────────────────────────────────────────────────────────
export function money(v: number): string {
  return v >= 1000 ? "$" + (v / 1000).toFixed(v % 1000 === 0 ? 0 : 1) + "k" : "$" + Math.round(v);
}

export function pct(a: number, b: number): number {
  return b ? Math.min(100, Math.round((a / b) * 100)) : 0;
}

export function fmtDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ── targets resolution ──────────────────────────────────────────────────
export interface TargetRow {
  month: string;
  bidder_id: string;
  leads_target: number;
  connects_cap: number;
  revenue_target: number;
}

export interface ResolvedTargets {
  leadsTarget: number;
  connectsCap: number;
  revenueTarget: number;
  overridden: boolean;
}

// Resolution order: exact `YYYY-MM` row → `default` row → hard-coded fallback.
export function resolveTargets(rows: TargetRow[], monthKey: string): ResolvedTargets {
  const exact = rows.find((r) => r.month === monthKey);
  const def = rows.find((r) => r.month === "default");
  const hit = exact ?? def;
  return {
    leadsTarget: hit?.leads_target ?? DEFAULT_TARGETS.leadsTarget,
    connectsCap: hit?.connects_cap ?? DEFAULT_TARGETS.connectsCap,
    revenueTarget: hit?.revenue_target ?? DEFAULT_TARGETS.revenueTarget,
    overridden: !!exact,
  };
}

// ── connects history reconciliation — the refund parser ────────────────
// Ported as-is from the prototype; do not "clean up" the regexes without
// re-testing against real Upwork connects-history pastes.
export interface ParsedRefundEntry {
  desc: string;
  amount: number;
}

const REFUND_KEYWORDS =
  /(refund|refunded|return|returned|expire|expired|unused|outbid|out-bid|withdraw|cancel|reversal|credited)/i;

const LEADING_DATE =
  /^\s*(?:\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4}|\d{4}-\d{2}-\d{2}|[A-Za-z]{3,9}\.?\s+\d{1,2}(?:st|nd|rd|th)?,?\s*\d{0,4}|\d{1,2}\s+[A-Za-z]{3,9},?\s*\d{0,4})\s*[,\t·|]*\s*/;

export function parseConnects(text: string): ParsedRefundEntry[] {
  return String(text || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((raw): ParsedRefundEntry | null => {
      // Strip the leading date column first — otherwise "Sep 09, 2026" reads as an amount.
      const line = raw.replace(LEADING_DATE, "").replace(/\b(?:19|20)\d{2}\b/g, " ");
      const isRefundWord = REFUND_KEYWORDS.test(line);
      const signed = line.match(/(?:^|[\s\t(])([+\-−–—])\s?(\d+(?:\.\d+)?)/);
      const cols = line
        .split(/\t+|\s{2,}/)
        .map((c) => c.trim())
        .filter(Boolean);
      const dropBalance =
        cols.length > 1 && /^[+\-−–—]?\s?\d+(?:\.\d+)?$/.test(cols[cols.length - 1]);

      let amount = 0;
      if (signed) {
        amount = (signed[1] === "+" ? 1 : -1) * parseFloat(signed[2]);
      } else if (isRefundWord) {
        // Prefer the number tied to the word "connect(s)"; otherwise the last
        // standalone integer that is not the running-balance column.
        const near =
          line.match(/(\d+(?:\.\d+)?)\s*connects?\b/i) ||
          line.match(/connects?\D{0,14}(\d+(?:\.\d+)?)/i);
        if (near) {
          amount = parseFloat(near[1]);
        } else {
          const nums = (dropBalance ? cols.slice(0, -1) : cols).join(" ").match(/\d+(?:\.\d+)?/g);
          if (nums) amount = parseFloat(nums[nums.length - 1]);
        }
      }

      const refund = amount > 0 || (isRefundWord && amount !== 0);
      if (!refund) return null;

      const desc = (dropBalance ? cols.slice(0, -1) : cols)
        .join(" · ")
        .replace(/(?:^|[\s(])[+\-−–—]\s?\d+(?:\.\d+)?/g, " ")
        .replace(/\s{2,}/g, " ")
        .replace(/^[\s·,\-−–—]+|[\s·,\-−–—]+$/g, "");

      return { desc: desc || raw, amount: Math.round(Math.abs(amount)) };
    })
    .filter((e): e is ParsedRefundEntry => e != null && e.amount > 0);
}

export interface MatchCandidate {
  id: string;
  title: string;
}

// Lowercase + strip punctuation, keep words > 3 chars, best word-overlap wins,
// require at least 2 matching words or the refund is unassigned.
export function matchEntry<T extends MatchCandidate>(
  entry: ParsedRefundEntry,
  pool: T[]
): T | null {
  const words = entry.desc
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3);

  let best: T | null = null;
  let bestScore = 0;
  for (const p of pool) {
    const t = p.title.toLowerCase();
    const score = words.filter((w) => t.includes(w)).length;
    if (score > bestScore) {
      bestScore = score;
      best = p;
    }
  }
  return bestScore >= 2 ? best : null;
}

// ── metrics ──────────────────────────────────────────────────────────────
export interface Aggregate {
  proposals: number;
  spent: number;
  refunded: number;
  connects: number;
  boosted: number;
  viewed: number;
  viewedPct: number;
  leads: number;
  value: number;
  confirmed: number;
  confirmedValue: number;
  pending: number;
  scored: Proposal[];
  highQ: number;
  highQLeads: number;
  highQValue: number;
  avgScore: number;
}

export function agg(list: Proposal[], poolConnects = 0): Aggregate {
  const leads = list.filter((p) => p.lead);
  const viewed = list.filter((p) => p.status !== "no_reply");
  const spent = list.reduce((a, p) => a + spentOf(p), 0);
  const rowRefunds = list.reduce((a, p) => a + (Number(p.refunded_connects) || 0), 0);
  const refunded = rowRefunds + poolConnects;
  const scored = list.filter((p) => p.score != null);

  return {
    proposals: list.length,
    spent,
    refunded,
    connects: Math.max(0, spent - refunded),
    boosted: list.filter((p) => p.boosted).length,
    viewed: viewed.length,
    viewedPct: list.length ? Math.round((viewed.length / list.length) * 100) : 0,
    leads: leads.length,
    value: leads.reduce((a, p) => a + reportedValue(p), 0),
    confirmed: leads.filter((p) => isConfirmed(p)).length,
    confirmedValue: leads.filter((p) => isConfirmed(p)).reduce((a, p) => a + reportedValue(p), 0),
    pending: list.filter((p) => p.score == null).length,
    scored,
    highQ: list.filter((p) => (p.score ?? 0) >= 4).length,
    highQLeads: list.filter((p) => (p.score ?? 0) >= 4 && p.lead).length,
    highQValue: list
      .filter((p) => (p.score ?? 0) >= 4 && p.lead)
      .reduce((a, p) => a + reportedValue(p), 0),
    avgScore: scored.length ? scored.reduce((a, p) => a + (p.score ?? 0), 0) / scored.length : 0,
  };
}

export type Pace = "No activity" | "Behind pace" | "Target met" | "On pace";

export function paceFor(a: Aggregate, leadsTarget: number): Pace {
  if (!a.proposals) return "No activity";
  const lp = pct(a.leads, leadsTarget);
  if (a.proposals > 0 && lp < 60) return "Behind pace";
  if (lp >= 100) return "Target met";
  return "On pace";
}

// ── month helpers ────────────────────────────────────────────────────────
export function monthKeyOf(date: Date): string {
  return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0");
}

export function monthLabel(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export function shiftMonth(monthKey: string, delta: number): string {
  const [y, m] = monthKey.split("-").map(Number);
  return monthKeyOf(new Date(y, m - 1 + delta, 1));
}

export function resolveMonthParam(month: string | undefined): string {
  return month && /^\d{4}-\d{2}$/.test(month) ? month : monthKeyOf(new Date());
}

// ── CSV export ───────────────────────────────────────────────────────────
export const CSV_COLUMNS = [
  "Month",
  "Bidder",
  "Date sent",
  "Job title",
  "Upwork link",
  "Category",
  "Subcategory",
  "Country",
  "Client budget",
  "Connects (base)",
  "Boosted",
  "Boost connects",
  "Connects spent",
  "Connects refunded",
  "Net connects",
  "Status",
  "Viewed",
  "Lead generated",
  "Lead value range (est.)",
  "Estimated value",
  "Confirmed value (after review)",
  "Reported value",
  "Value confirmed",
  "Evaluation score",
  "High quality (4★+)",
  "Evaluation comments",
];

function csvEscape(v: unknown): string {
  return '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"';
}

export function csvRow(p: Proposal, bidderName: string): (string | number)[] {
  return [
    p.month,
    bidderName,
    p.date_sent,
    p.title,
    p.url ?? "",
    p.category,
    p.subcategory ?? "",
    p.country,
    p.client_budget,
    p.connects,
    p.boosted ? "Yes" : "No",
    p.boosted ? p.boost_connects || 0 : 0,
    spentOf(p),
    p.refunded_connects || 0,
    netOf(p),
    statusLabel(p.status),
    p.status !== "no_reply" ? "Yes" : "No",
    p.lead ? "Yes" : "No",
    p.lead ? bandFor(p.lead_value).label : "",
    p.lead ? p.lead_value || 0 : 0,
    isConfirmed(p) ? reportedValue(p) : "",
    p.lead ? reportedValue(p) : 0,
    p.lead ? (isConfirmed(p) ? "Yes" : "No") : "",
    p.score ?? "",
    (p.score ?? 0) >= 4 ? "Yes" : p.score ? "No" : "",
    p.comment ?? "",
  ];
}

export function buildCsv(
  rows: { proposal: Proposal; bidderName: string }[],
  unassignedPool: { month: string; bidderName: string; connects: number }[] = []
): string {
  const lines = [CSV_COLUMNS.map(csvEscape).join(",")];
  for (const r of rows) {
    lines.push(csvRow(r.proposal, r.bidderName).map(csvEscape).join(","));
  }
  let csv = lines.join("\r\n");
  if (unassignedPool.length) {
    csv += "\r\n\r\n";
    csv += csvEscape("Unassigned connect refunds (from pasted connects history)") + "\r\n";
    csv += [csvEscape("Month"), csvEscape("Bidder"), csvEscape("Connects refunded")].join(",") + "\r\n";
    csv += unassignedPool
      .map((r) => [csvEscape(r.month), csvEscape(r.bidderName), csvEscape(r.connects)].join(","))
      .join("\r\n");
  }
  return csv;
}
