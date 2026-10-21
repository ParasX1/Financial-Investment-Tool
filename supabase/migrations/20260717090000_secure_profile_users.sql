begin;

alter table public."Users" add column if not exists avatar_path text;
alter table public."Users" enable row level security;

-- This legacy policy exposed account email, phone and portfolio data together
-- with public profile fields. Public identity is served by public.profiles.
drop policy if exists "Public profiles are viewable by everyone." on public."Users";
drop policy if exists "Users can read their own profile." on public."Users";
drop policy if exists "Users can insert their own profile." on public."Users";
drop policy if exists "Users can update own profile." on public."Users";

create policy "Users can read their own profile."
on public."Users" for select
to authenticated
using ((select auth.uid()) = id);

create policy "Users can update own profile."
on public."Users" for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

revoke all on table public."Users" from public, anon, authenticated;
grant select on table public."Users" to authenticated;
grant update (first_name, last_name, handle, phone, avatar_path, avatar_url)
on table public."Users" to authenticated;
grant all on table public."Users" to service_role;

-- Public buckets can still serve image URLs without allowing anonymous object
-- listing. Authenticated users only need metadata access to their own objects.
drop policy if exists "Avatar images are publicly readable." on storage.objects;
drop policy if exists "Users can read their own avatar records." on storage.objects;
drop policy if exists "Users can upload their own avatar images." on storage.objects;
drop policy if exists "Users can update their own avatar images." on storage.objects;
drop policy if exists "Users can delete their own avatar images." on storage.objects;

create policy "Users can read their own avatar records."
on storage.objects for select
to authenticated
using (
  bucket_id = 'avatars'
  and owner_id = (select auth.uid())::text
  and name = (select auth.uid())::text || '/avatar'
);

create policy "Users can upload their own avatar images."
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and name = (select auth.uid())::text || '/avatar'
);

create policy "Users can update their own avatar images."
on storage.objects for update
to authenticated
using (
  bucket_id = 'avatars'
  and owner_id = (select auth.uid())::text
  and name = (select auth.uid())::text || '/avatar'
)
with check (
  bucket_id = 'avatars'
  and owner_id = (select auth.uid())::text
  and name = (select auth.uid())::text || '/avatar'
);

create policy "Users can delete their own avatar images."
on storage.objects for delete
to authenticated
using (
  bucket_id = 'avatars'
  and owner_id = (select auth.uid())::text
  and name = (select auth.uid())::text || '/avatar'
);

-- Keep auth-owned row creation deterministic across clean and remote replays.
create or replace function public.handle_new_user() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public."Users" (id, first_name, last_name, email)
  values (
    new.id,
    nullif(btrim(new.raw_user_meta_data ->> 'first_name'), ''),
    nullif(btrim(new.raw_user_meta_data ->> 'last_name'), ''),
    new.email
  );
  return new;
end;
$$;

-- Backfill any legacy auth accounts whose profile row was missed by the old
-- trigger before client-side inserts are removed.
insert into public."Users" (id, first_name, last_name, email)
select
  account.id,
  nullif(btrim(account.raw_user_meta_data ->> 'first_name'), ''),
  nullif(btrim(account.raw_user_meta_data ->> 'last_name'), ''),
  account.email
from auth.users as account
on conflict (id) do nothing;

-- This trigger runs as its definer; client roles never need to call it directly.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
grant execute on function public.handle_new_user() to service_role;

commit;
