begin;

-- RLS cannot protect TRUNCATE / REFERENCES / TRIGGER. The original dump also
-- granted every future public object to browser roles; every new API surface
-- must instead declare its required grants explicitly next to its policies.
alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all on functions from anon, authenticated;
-- PostgreSQL's built-in PUBLIC function default is global. A schema-scoped
-- revoke cannot override it, so remove that global default for this creator.
alter default privileges for role postgres revoke execute on functions from public;

revoke all on table public.profiles, public.tickers, public.top_picks_universe,
  public."Stocks", public."Symbols" from public, anon, authenticated;
revoke all on sequence public."Stocks_id_seq", public."Symbols_id_seq",
  public.tickers_id_seq from public, anon, authenticated;
grant select on table public.profiles, public.tickers, public.top_picks_universe
  to anon, authenticated;
grant insert (id, first_name, last_name, avatar_url, updated_at),
  update (first_name, last_name, avatar_url, updated_at)
  on table public.profiles to authenticated;

-- Public buckets serve object URLs without giving anonymous clients a list
-- endpoint. Storage's canonical owner_id is set from the JWT on real uploads;
-- legacy owner (uuid) is deprecated and must not grant additional ownership.
drop policy if exists "Users can upload their own avatar images." on storage.objects;
create policy "Users can upload their own avatar images."
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and owner_id = (select auth.uid())::text
    and name = (select auth.uid())::text || '/avatar'
  );

drop policy if exists "Authenticated users can upload community comment images" on storage.objects;
drop policy if exists "Authenticated users can upload community images" on storage.objects;
drop policy if exists "Community comment image owners can update" on storage.objects;
drop policy if exists "Community comment image owners can delete" on storage.objects;
drop policy if exists "Community discussion owners can delete comment images" on storage.objects;
drop policy if exists "Community image owners can read" on storage.objects;

create policy "Community image owners can read"
  on storage.objects for select to authenticated
  using (bucket_id = 'comment-images' and owner_id = (select auth.uid())::text);
create policy "Authenticated users can upload community images"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'comment-images'
    and owner_id = (select auth.uid())::text
    and (name like 'posts/%' or name like 'comments/%')
  );
create policy "Community comment image owners can update"
  on storage.objects for update to authenticated
  using (bucket_id = 'comment-images' and owner_id = (select auth.uid())::text)
  with check (
    bucket_id = 'comment-images'
    and owner_id = (select auth.uid())::text
    and (name like 'posts/%' or name like 'comments/%')
  );
create policy "Community comment image owners can delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'comment-images' and owner_id = (select auth.uid())::text);

commit;
