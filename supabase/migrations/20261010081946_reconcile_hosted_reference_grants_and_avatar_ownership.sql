-- Complete the applicable reviewed #288 effects on the hosted schema.
-- Existing functions, Users, service grants and other creators stay unchanged.
begin;
set local lock_timeout = '3s';
set local statement_timeout = '30s';

alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all on functions from anon, authenticated;
-- Global PUBLIC EXECUTE cannot be removed by a schema-scoped revoke.
alter default privileges for role postgres revoke execute on functions from public;

revoke all on table public.profiles, public.tickers, public.top_picks_universe
  from public, anon, authenticated;
revoke all on sequence public.tickers_id_seq from public, anon, authenticated;
grant select on table public.profiles, public.tickers, public.top_picks_universe
  to anon, authenticated;
grant insert (id, first_name, last_name, avatar_url, updated_at),
  update (first_name, last_name, avatar_url, updated_at)
  on table public.profiles to authenticated;

alter policy "Users can upload their own avatar images." on storage.objects
  to authenticated
  with check (
    bucket_id = 'avatars'
    and owner_id = (select auth.uid())::text
    and name = (select auth.uid())::text || '/avatar'
  );
notify pgrst, 'reload schema';
commit;
