-- Visitor statistics for Areej Flowers.
--
-- HOW TO APPLY: Supabase Dashboard → SQL Editor → paste this whole file → Run.
-- The table starts EMPTY: no historical numbers are invented or backfilled;
-- visits are counted only from the moment this migration runs.
-- Then redeploy the site (the recording code and the dashboard section are
-- already in the repo). Until this migration runs, visit recording fails
-- silently (the site is unaffected) and the dashboard shows a setup hint.
--
-- DESIGN (privacy-first, anonymous):
--   * One row per (anonymous visitor, UTC day). No IP address, no user agent,
--     no personal data of any kind is stored.
--   * The visitor id is a random UUID generated in the visitor's own browser
--     and kept in their localStorage; it cannot be traced back to a person.
--   * A UNIQUE(visitor_id, visit_date) constraint + a plain INSERT in the
--     code make recording idempotent: a repeat insert comes back 409
--     ("already recorded"), which the client treats as success. Do NOT
--     use an upsert (on_conflict + resolution=ignore-duplicates) here:
--     it needs SELECT permission on the table to detect conflicts, which
--     visitors deliberately do NOT have under RLS, so every upsert was
--     rejected with 42501 even though the INSERT policy is correct.
--   * RLS: anyone may INSERT one row per day (guarded by a UUID-format check
--     and a visit_date window of yesterday..today); only the admin may
--     SELECT or DELETE. The dashboard reads aggregates through the
--     SECURITY DEFINER function below, which refuses non-admins.
--   * "Today" is the UTC day, on both the client and the server, so the
--     numbers always agree.

create table if not exists public.visits (
  id uuid primary key default gen_random_uuid(),
  visitor_id text not null,
  visit_date date not null,
  created_at timestamptz not null default now(),
  constraint visits_visitor_id_uuid check (
    visitor_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  ),
  constraint visits_unique_visitor_day unique (visitor_id, visit_date)
);

create index if not exists visits_visit_date_idx on public.visits (visit_date);

alter table public.visits enable row level security;

drop policy if exists "Visitors can record visits" on public.visits;
create policy "Visitors can record visits" on public.visits
  for insert to anon, authenticated
  with check (
    visitor_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and visit_date >= CURRENT_DATE - 1
    and visit_date <= CURRENT_DATE
  );

drop policy if exists "Admins read visits" on public.visits;
create policy "Admins read visits" on public.visits
  for select to authenticated
  using (public.is_admin());

drop policy if exists "Admins delete visits" on public.visits;
create policy "Admins delete visits" on public.visits
  for delete to authenticated
  using (public.is_admin());

-- Aggregates for the admin dashboard. SECURITY DEFINER so it can count
-- without exposing raw rows; it refuses anyone who is not the admin.
create or replace function public.get_visitor_stats()
returns jsonb
language plpgsql
security definer
set search_path = public
as $func$
declare
  result jsonb;
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'total', (select count(distinct visitor_id) from public.visits),
    'today', (select count(distinct visitor_id) from public.visits where visit_date = CURRENT_DATE),
    'last7', (select count(distinct visitor_id) from public.visits where visit_date >= CURRENT_DATE - 6),
    'last30', (select count(distinct visitor_id) from public.visits where visit_date >= CURRENT_DATE - 29),
    'daily', coalesce((
      select jsonb_agg(jsonb_build_object('date', d, 'count', c) order by d)
      from (
        select visit_date as d, count(distinct visitor_id) as c
        from public.visits
        where visit_date >= CURRENT_DATE - 29
        group by visit_date
      ) s
    ), '[]'::jsonb)
  ) into result;

  return result;
end;
$func$;

revoke execute on function public.get_visitor_stats() from anon, authenticated;
grant execute on function public.get_visitor_stats() to authenticated;
