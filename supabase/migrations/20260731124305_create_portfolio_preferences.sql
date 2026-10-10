create table if not exists public.portfolio_prefs (
  user_id uuid primary key references auth.users(id) on delete cascade,
  tags text[] not null default '{}'::text[],
  updated_at timestamptz not null default now()
);

-- Ownership cannot be inferred for legacy rows. Fail before altering a
-- populated incompatible table instead of deleting or assigning those rows.
do $$
declare
  user_id_exists boolean;
  rows_without_owner boolean;
begin
  select exists (
    select 1
    from pg_attribute as attribute
    where attribute.attrelid = 'public.portfolio_prefs'::regclass
      and attribute.attname = 'user_id'
      and not attribute.attisdropped
  )
  into user_id_exists;

  if user_id_exists then
    execute
      'select exists (
        select 1
        from public.portfolio_prefs
        where user_id is null
      )'
    into rows_without_owner;
  else
    select exists (select 1 from public.portfolio_prefs)
    into rows_without_owner;
  end if;

  if rows_without_owner then
    raise exception using
      errcode = '23502',
      message = 'Existing public.portfolio_prefs rows require a non-null user_id before owner-only RLS can be installed.';
  end if;
end
$$;

-- Bring an existing compatible table up to the same column contract.
alter table public.portfolio_prefs
  add column if not exists user_id uuid,
  add column if not exists tags text[] default '{}'::text[],
  add column if not exists updated_at timestamptz default now();

update public.portfolio_prefs
set tags = '{}'::text[]
where tags is null;

update public.portfolio_prefs
set updated_at = now()
where updated_at is null;

alter table public.portfolio_prefs
  alter column user_id set not null,
  alter column tags set default '{}'::text[],
  alter column tags set not null,
  alter column updated_at set default now(),
  alter column updated_at set not null;

do $$
declare
  user_id_attribute smallint;
begin
  select attribute.attnum
  into user_id_attribute
  from pg_attribute as attribute
  where attribute.attrelid = 'public.portfolio_prefs'::regclass
    and attribute.attname = 'user_id'
    and not attribute.attisdropped;

  if not exists (
    select 1
    from pg_constraint as constraint_record
    where constraint_record.conrelid = 'public.portfolio_prefs'::regclass
      and constraint_record.contype = 'p'
      and constraint_record.conkey = array[user_id_attribute]
  ) then
    if exists (
      select 1
      from pg_constraint as constraint_record
      where constraint_record.conrelid = 'public.portfolio_prefs'::regclass
        and constraint_record.contype = 'p'
    ) then
      raise exception
        'public.portfolio_prefs already has a primary key other than user_id';
    end if;

    alter table public.portfolio_prefs
      add constraint portfolio_prefs_pkey primary key (user_id);
  end if;
end
$$;

do $$
declare
  user_id_attribute smallint;
  auth_user_id_attribute smallint;
begin
  select attribute.attnum
  into user_id_attribute
  from pg_attribute as attribute
  where attribute.attrelid = 'public.portfolio_prefs'::regclass
    and attribute.attname = 'user_id'
    and not attribute.attisdropped;

  select attribute.attnum
  into auth_user_id_attribute
  from pg_attribute as attribute
  where attribute.attrelid = 'auth.users'::regclass
    and attribute.attname = 'id'
    and not attribute.attisdropped;

  if not exists (
    select 1
    from pg_constraint as constraint_record
    where constraint_record.conrelid = 'public.portfolio_prefs'::regclass
      and constraint_record.contype = 'f'
      and constraint_record.confrelid = 'auth.users'::regclass
      and constraint_record.conkey = array[user_id_attribute]
      and constraint_record.confkey = array[auth_user_id_attribute]
      and constraint_record.confdeltype = 'c'
  ) then
    alter table public.portfolio_prefs
      add constraint portfolio_prefs_user_id_fkey
      foreign key (user_id) references auth.users(id) on delete cascade;
  end if;
end
$$;

alter table public.portfolio_prefs enable row level security;

revoke all on table public.portfolio_prefs from public;
revoke all on table public.portfolio_prefs from anon, authenticated;
grant select, insert, update on table public.portfolio_prefs to authenticated;

-- Policies are permissive by default, so remove any pre-existing policy before
-- installing the owner-only contract.
do $$
declare
  existing_policy record;
begin
  for existing_policy in
    select policy.policyname
    from pg_policies as policy
    where policy.schemaname = 'public'
      and policy.tablename = 'portfolio_prefs'
  loop
    execute format(
      'drop policy if exists %I on public.portfolio_prefs',
      existing_policy.policyname
    );
  end loop;
end
$$;

create policy "portfolio_prefs_select_own"
  on public.portfolio_prefs
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "portfolio_prefs_insert_own"
  on public.portfolio_prefs
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "portfolio_prefs_update_own"
  on public.portfolio_prefs
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

comment on table public.portfolio_prefs is
  'Private per-user portfolio preferences.';
