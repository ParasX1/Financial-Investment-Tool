-- Reconcile the unversioned remote draft with a reproducible local schema.
-- This migration is intentionally safe for both a clean database and the
-- existing public.user_watchlist table.

create table if not exists public.user_watchlist (
  user_id uuid not null default auth.uid(),
  symbol text not null,
  position integer not null,
  note text,
  target_price numeric(20, 6),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint user_watchlist_pkey primary key (user_id, symbol),
  constraint user_watchlist_user_id_fkey
    foreign key (user_id) references auth.users(id) on delete cascade
);

alter table public.user_watchlist
  add column if not exists note text,
  add column if not exists target_price numeric(20, 6),
  add column if not exists updated_at timestamp with time zone;

alter table public.user_watchlist
  alter column user_id set default auth.uid(),
  alter column created_at set default now(),
  alter column updated_at set default now();

do $$
begin
  if exists (
    select 1
    from public.user_watchlist
    where upper(btrim(symbol)) !~ '^[A-Z0-9^][A-Z0-9.^=_-]{0,19}$'
  ) then
    raise exception using
      errcode = '23514',
      message = 'Existing watchlist data contains an invalid symbol.';
  end if;
end
$$;

with normalized_duplicates as (
  select
    ctid,
    row_number() over (
      partition by user_id, upper(btrim(symbol))
      order by position, created_at nulls last, ctid
    ) as duplicate_rank
  from public.user_watchlist
)
delete from public.user_watchlist as saved_item
using normalized_duplicates as ranked
where saved_item.ctid = ranked.ctid
  and ranked.duplicate_rank > 1;

do $$
begin
  if exists (
    select 1
    from public.user_watchlist
    group by user_id
    having count(*) > 20
  ) then
    raise exception using
      errcode = '23514',
      message = 'An existing watchlist contains more than 20 unique symbols.';
  end if;
end
$$;

update public.user_watchlist
set
  symbol = upper(btrim(symbol)),
  created_at = coalesce(created_at, now()),
  updated_at = coalesce(updated_at, created_at, now());

with ranked_positions as (
  select
    ctid,
    (row_number() over (
      partition by user_id
      order by position, created_at, symbol
    ) - 1)::integer as position
  from public.user_watchlist
)
update public.user_watchlist as saved_item
set position = ranked.position
from ranked_positions as ranked
where saved_item.ctid = ranked.ctid;

alter table public.user_watchlist
  alter column created_at set not null,
  alter column updated_at set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.user_watchlist'::regclass
      and conname = 'user_watchlist_pkey'
  ) then
    alter table public.user_watchlist
      add constraint user_watchlist_pkey primary key (user_id, symbol);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.user_watchlist'::regclass
      and conname = 'user_watchlist_user_id_fkey'
  ) then
    alter table public.user_watchlist
      add constraint user_watchlist_user_id_fkey
      foreign key (user_id) references auth.users(id) on delete cascade;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.user_watchlist'::regclass
      and conname = 'user_watchlist_symbol_check'
  ) then
    alter table public.user_watchlist
      add constraint user_watchlist_symbol_check
      check (
        symbol = upper(btrim(symbol))
        and symbol ~ '^[A-Z0-9^][A-Z0-9.^=_-]{0,19}$'
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.user_watchlist'::regclass
      and conname = 'user_watchlist_position_check'
  ) then
    alter table public.user_watchlist
      add constraint user_watchlist_position_check
      check (position between 0 and 19);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.user_watchlist'::regclass
      and conname = 'user_watchlist_note_check'
  ) then
    alter table public.user_watchlist
      add constraint user_watchlist_note_check
      check (note is null or char_length(note) <= 280);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.user_watchlist'::regclass
      and conname = 'user_watchlist_target_price_check'
  ) then
    alter table public.user_watchlist
      add constraint user_watchlist_target_price_check
      check (target_price is null or target_price > 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.user_watchlist'::regclass
      and conname = 'user_watchlist_user_position_key'
  ) then
    alter table public.user_watchlist
      add constraint user_watchlist_user_position_key
      unique (user_id, position)
      deferrable initially deferred;
  end if;
end
$$;

create or replace function public.set_user_watchlist_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_user_watchlist_updated_at on public.user_watchlist;
create trigger set_user_watchlist_updated_at
before update on public.user_watchlist
for each row execute function public.set_user_watchlist_updated_at();

revoke all on function public.set_user_watchlist_updated_at()
from public, anon, authenticated;

alter table public.user_watchlist enable row level security;

drop policy if exists "Users can read own watchlist" on public.user_watchlist;
drop policy if exists "Users can insert own watchlist" on public.user_watchlist;
drop policy if exists "Users can delete own watchlist" on public.user_watchlist;
drop policy if exists "watchlist_select_own" on public.user_watchlist;
drop policy if exists "watchlist_insert_own" on public.user_watchlist;
drop policy if exists "watchlist_update_own" on public.user_watchlist;
drop policy if exists "watchlist_delete_own" on public.user_watchlist;

create policy "watchlist_select_own"
on public.user_watchlist
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "watchlist_insert_own"
on public.user_watchlist
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "watchlist_update_own"
on public.user_watchlist
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "watchlist_delete_own"
on public.user_watchlist
for delete
to authenticated
using ((select auth.uid()) = user_id);

revoke all on table public.user_watchlist
from public, anon, authenticated, service_role;
grant select, insert, update, delete on table public.user_watchlist
to authenticated, service_role;

create or replace function public.reorder_watchlist(ordered_symbols text[])
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  normalized_symbols text[];
  saved_item_count integer;
begin
  if current_user_id is null then
    raise exception using
      errcode = '42501',
      message = 'Authentication is required.';
  end if;

  if ordered_symbols is null or cardinality(ordered_symbols) > 20 then
    raise exception using
      errcode = '22023',
      message = 'The watchlist order must contain at most 20 symbols.';
  end if;

  if exists (
    select 1
    from unnest(ordered_symbols) as raw_symbol
    where raw_symbol is null
      or upper(btrim(raw_symbol)) !~ '^[A-Z0-9^][A-Z0-9.^=_-]{0,19}$'
  ) then
    raise exception using
      errcode = '22023',
      message = 'The watchlist order contains an invalid symbol.';
  end if;

  select coalesce(
    array_agg(upper(btrim(item.symbol)) order by item.ordinality),
    array[]::text[]
  )
  into normalized_symbols
  from unnest(ordered_symbols) with ordinality as item(symbol, ordinality);

  if cardinality(normalized_symbols) <> (
    select count(distinct symbol_value)
    from unnest(normalized_symbols) as symbol_value
  ) then
    raise exception using
      errcode = '22023',
      message = 'The watchlist order cannot contain duplicate symbols.';
  end if;

  select count(*)
  into saved_item_count
  from public.user_watchlist
  where user_id = current_user_id;

  if saved_item_count <> cardinality(normalized_symbols) or exists (
    select 1
    from unnest(normalized_symbols) as ordered_symbol
    where not exists (
      select 1
      from public.user_watchlist as saved_item
      where saved_item.user_id = current_user_id
        and saved_item.symbol = ordered_symbol
    )
  ) then
    raise exception using
      errcode = '22023',
      message = 'The watchlist order must contain every saved symbol exactly once.';
  end if;

  update public.user_watchlist as saved_item
  set position = (ordered_item.ordinality - 1)::integer
  from unnest(normalized_symbols) with ordinality
    as ordered_item(symbol, ordinality)
  where saved_item.user_id = current_user_id
    and saved_item.symbol = ordered_item.symbol;
end;
$$;

revoke all on function public.reorder_watchlist(text[])
from public, anon;
grant execute on function public.reorder_watchlist(text[])
to authenticated;

create or replace function public.remove_watchlist_item(item_symbol text)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  normalized_symbol text := upper(btrim(item_symbol));
  removed_position integer;
begin
  if current_user_id is null then
    raise exception using
      errcode = '42501',
      message = 'Authentication is required.';
  end if;

  if item_symbol is null
    or normalized_symbol !~ '^[A-Z0-9^][A-Z0-9.^=_-]{0,19}$'
  then
    raise exception using
      errcode = '22023',
      message = 'The watchlist symbol is invalid.';
  end if;

  delete from public.user_watchlist
  where user_id = current_user_id
    and symbol = normalized_symbol
  returning position into removed_position;

  if removed_position is null then
    return;
  end if;

  update public.user_watchlist
  set position = position - 1
  where user_id = current_user_id
    and position > removed_position;
end;
$$;

revoke all on function public.remove_watchlist_item(text)
from public, anon;
grant execute on function public.remove_watchlist_item(text)
to authenticated;

comment on table public.user_watchlist is
  'Private per-user research queue used by Watchlist and related market features.';
