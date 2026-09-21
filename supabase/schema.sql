-- Qualix Bid Tracker — Supabase schema
-- Run against a fresh Supabase project (SQL Editor), then seed the three profiles at the bottom.

create type user_role as enum ('super_admin', 'team_lead', 'bidder');
create type proposal_status as enum ('no_reply', 'viewed', 'replied', 'interview', 'hired');

-- ───────────────────────────── profiles
create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text unique not null,
  full_name   text not null,
  initials    text not null,
  role        user_role not null,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ───────────────────────────── proposals
create table proposals (
  id                uuid primary key default gen_random_uuid(),
  bidder_id         uuid not null references profiles(id),
  title             text not null,
  url               text,
  date_sent         date not null,
  -- to_char() is only STABLE (locale-dependent), not IMMUTABLE, so a generated
  -- column can't use it — build the 'YYYY-MM' string from extract() instead.
  month             text generated always as (
    lpad(extract(year from date_sent)::int::text, 4, '0') || '-' ||
    lpad(extract(month from date_sent)::int::text, 2, '0')
  ) stored,

  category          text not null,
  subcategory       text,
  country           text not null,
  client_budget     numeric(12,2) not null default 0,

  connects          integer not null default 0,
  boosted           boolean not null default false,
  boost_connects    integer not null default 0,
  refunded_connects integer not null default 0,

  status            proposal_status not null default 'no_reply',

  lead              boolean not null default false,
  lead_value        numeric(12,2) not null default 0,  -- bidder's estimate (band midpoint)
  actual_value      numeric(12,2),                     -- team lead's confirmed value

  score             smallint check (score between 1 and 5),
  comment           text,
  reviewed_by       uuid references profiles(id),
  reviewed_at       timestamptz,

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  constraint actual_value_requires_lead check (actual_value is null or lead)
);
create index proposals_bidder_month_idx on proposals (bidder_id, month);
create index proposals_month_idx        on proposals (month);

-- ───────────────────────────── refunds that matched no proposal
create table refund_pool (
  month      text not null,
  bidder_id  uuid not null references profiles(id),
  connects   integer not null default 0,
  primary key (month, bidder_id)
);

-- ───────────────────────────── monthly targets ('YYYY-MM' override, or 'default')
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

-- ───────────────────────────── raw connects-history pastes, for traceability
create table connects_imports (
  id          uuid primary key default gen_random_uuid(),
  bidder_id   uuid not null references profiles(id),
  month       text not null,
  raw_text    text not null,
  applied     jsonb not null,
  created_at  timestamptz not null default now(),
  created_by  uuid not null references profiles(id)
);

-- ───────────────────────────── keep updated_at honest
create or replace function touch_updated_at() returns trigger
  language plpgsql as $fn$
begin
  new.updated_at = now();
  return new;
end;
$fn$;
create trigger proposals_touch before update on proposals
  for each row execute function touch_updated_at();

-- ───────────────────────────── row level security
create or replace function current_role_of() returns user_role
  language sql stable security definer set search_path = public as $fn$
  select role from profiles where id = auth.uid();
$fn$;

alter table profiles         enable row level security;
alter table proposals        enable row level security;
alter table refund_pool      enable row level security;
alter table targets          enable row level security;
alter table connects_imports enable row level security;

create policy read_profiles on profiles for select using (auth.uid() is not null);

create policy read_proposals on proposals for select using (
  current_role_of() in ('super_admin','team_lead') or bidder_id = auth.uid()
);
create policy insert_proposals on proposals for insert with check (
  current_role_of() in ('super_admin','team_lead') or bidder_id = auth.uid()
);
-- Bidders cannot update a logged proposal. Refunds go through apply_connects_refunds().
create policy update_proposals on proposals for update using (
  current_role_of() in ('super_admin','team_lead')
);
create policy delete_proposals on proposals for delete using (
  current_role_of() = 'super_admin'
);

create policy read_targets on targets for select using (
  current_role_of() in ('super_admin','team_lead') or bidder_id = auth.uid()
);
create policy write_targets on targets for all using (
  current_role_of() in ('super_admin','team_lead')
) with check (
  current_role_of() in ('super_admin','team_lead')
);

create policy read_pool on refund_pool for select using (
  current_role_of() in ('super_admin','team_lead') or bidder_id = auth.uid()
);
create policy read_imports on connects_imports for select using (
  current_role_of() in ('super_admin','team_lead') or bidder_id = auth.uid()
);

-- ───────────────────────────── the one write a bidder may make to an existing proposal
-- matches: [{"proposal_id": "...", "amount": 12}, ...]   unassigned: whole connects
create or replace function apply_connects_refunds(
  p_bidder    uuid,
  p_month     text,
  p_matches   jsonb,
  p_unassigned integer,
  p_raw       text
) returns void
language plpgsql security definer set search_path = public as $fn$
declare m jsonb;
begin
  if not (auth.uid() = p_bidder or current_role_of() in ('super_admin','team_lead')) then
    raise exception 'not allowed';
  end if;

  for m in select * from jsonb_array_elements(p_matches) loop
    update proposals
       set refunded_connects = least(
             connects + case when boosted then boost_connects else 0 end,
             refunded_connects + (m->>'amount')::int)
     where id = (m->>'proposal_id')::uuid
       and bidder_id = p_bidder
       and month = p_month;
  end loop;

  if coalesce(p_unassigned, 0) > 0 then
    insert into refund_pool (month, bidder_id, connects)
    values (p_month, p_bidder, p_unassigned)
    on conflict (month, bidder_id)
      do update set connects = refund_pool.connects + excluded.connects;
  end if;

  insert into connects_imports (bidder_id, month, raw_text, applied, created_by)
  values (p_bidder, p_month, p_raw,
          jsonb_build_object('matches', p_matches, 'unassigned', coalesce(p_unassigned, 0)),
          auth.uid());
end;
$fn$;

-- ───────────────────────────── seed
-- Invite the three users in Supabase Auth first, then map their auth ids here.
-- insert into profiles (id, email, full_name, initials, role) values
--   ('<auth-uuid>', 'naveed@qualixsolutions.com', 'Naveed Ahmed',     'NA', 'super_admin'),
--   ('<auth-uuid>', 'abeer@qualixsolutions.com',  'Abeer Shah Khan',  'AK', 'team_lead'),
--   ('<auth-uuid>', 'usama@qualixsolutions.com',  'Syed Usama Ali',   'SU', 'bidder');
--
-- insert into targets (month, bidder_id, leads_target, connects_cap, revenue_target)
--   select 'default', id, 12, 420, 60000 from profiles where role = 'bidder';
