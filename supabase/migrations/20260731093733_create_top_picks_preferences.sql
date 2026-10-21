create table public.top_picks_prefs (
  user_id uuid primary key references auth.users(id) on delete cascade,
  sort_key text not null default 'sharpe',
  sort_dir text not null default 'desc',
  page_size integer not null default 25,
  updated_at timestamp with time zone not null default now(),
  constraint top_picks_prefs_sort_key_check
    check (
      sort_key in (
        'ret1y',
        'sharpe',
        'sortino',
        'volatility',
        'maxDD',
        'beta',
        'alpha',
        'infoRatio'
      )
    ),
  constraint top_picks_prefs_sort_dir_check
    check (sort_dir in ('asc', 'desc')),
  constraint top_picks_prefs_page_size_check
    check (page_size in (10, 25, 50, 100))
);

alter table public.top_picks_prefs enable row level security;

revoke all on table public.top_picks_prefs from anon, authenticated;
grant select, insert, update on table public.top_picks_prefs to authenticated;

drop policy if exists "top_picks_prefs_select_own"
  on public.top_picks_prefs;
create policy "top_picks_prefs_select_own"
  on public.top_picks_prefs
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "top_picks_prefs_insert_own"
  on public.top_picks_prefs;
create policy "top_picks_prefs_insert_own"
  on public.top_picks_prefs
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "top_picks_prefs_update_own"
  on public.top_picks_prefs;
create policy "top_picks_prefs_update_own"
  on public.top_picks_prefs
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

comment on table public.top_picks_prefs is
  'Private per-user Top Picks table preferences.';
