-- Reconcile current Community writes while preserving deployed RPC callers.
-- Hosted compatibility expansion from verified source migrations.
-- Existing hosted 9/1/1 signatures are intentionally preserved. All new
-- identity arguments remain REQUIRED: do not add defaults to overloads.
-- A fresh source replay has only the new 10/2/2 signatures; this never
-- recreates removed old signatures. Scope excludes managed Storage grants,
-- avatars, public default grants, missing Stocks/Symbols, and cleanup workers.

begin;

set local lock_timeout = '3s';
set local statement_timeout = '30s';

-- Atomically creates a Community post and its canonical ordered ticker rows.

create or replace function public.create_community_post_with_tickers(
  p_expected_author_id uuid,
  p_title text,
  p_body text,
  p_tags text[],
  p_post_type text,
  p_time_frame text,
  p_tickers text[],
  p_source_url text,
  p_image_url text,
  p_image_path text
)
returns setof public.posts
language plpgsql
security invoker
set search_path = ''
as $$
declare
  new_post public.posts%rowtype;
  v_tickers text[] := coalesce(p_tickers, '{}'::text[]);
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication is required.';
  end if;

  if p_expected_author_id is distinct from (select auth.uid()) then
    raise exception 'Your session changed. Please try again.' using errcode = '42501';
  end if;

  if cardinality(v_tickers) > 4 then
    raise exception 'Add up to 4 tickers.';
  end if;

  if exists (
    select 1
    from unnest(v_tickers) as ticker
    where ticker is null
      or ticker <> upper(btrim(ticker))
      or ticker !~ '^[A-Z0-9][A-Z0-9.\-^=]{0,23}$'
  ) then
    raise exception 'Enter valid normalized tickers.';
  end if;

  if cardinality(v_tickers) <> (
    select count(distinct ticker)
    from unnest(v_tickers) as ticker
  ) then
    raise exception 'Ticker symbols must be unique.';
  end if;

  insert into public.posts (
    title,
    body,
    tags,
    post_type,
    time_frame,
    symbol,
    source_url,
    image_url,
    image_path,
    author_id
  )
  values (
    p_title,
    p_body,
    p_tags,
    p_post_type,
    p_time_frame,
    v_tickers[1],
    p_source_url,
    p_image_url,
    p_image_path,
    p_expected_author_id
  )
  returning * into new_post;

  insert into public.post_tickers (post_id, symbol, position)
  select
    new_post.id,
    ticker,
    (ordinality - 1)::smallint
  from unnest(v_tickers) with ordinality as ordered_ticker(ticker, ordinality);

  return next new_post;
end;
$$;

comment on function public.create_community_post_with_tickers(
  uuid, text, text, text[], text, text, text[], text, text, text
) is 'Atomically creates one Community post and up to four ordered ticker rows.';

revoke execute on function public.create_community_post_with_tickers(
  uuid, text, text, text[], text, text, text[], text, text, text
) from public, anon, authenticated;

grant execute on function public.create_community_post_with_tickers(
  uuid, text, text, text[], text, text, text[], text, text, text
) to authenticated;

create or replace function public.like_community_post(target_post_id uuid, p_expected_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  next_votes integer;
begin
  if current_user_id is null then
    raise exception 'Sign in to like discussions.' using errcode = '28000';
  end if;

  if p_expected_user_id is distinct from current_user_id then
    raise exception 'Your session changed. Please try again.' using errcode = '42501';
  end if;

  if not exists (select 1 from public.posts where id = target_post_id) then
    raise exception 'Discussion not found.' using errcode = 'P0002';
  end if;

  insert into public.post_likes (post_id, user_id)
  values (target_post_id, current_user_id)
  on conflict do nothing;

  if found then
    update public.posts
    set votes = coalesce(votes, 0) + 1
    where id = target_post_id
    returning votes into next_votes;
  else
    select coalesce(votes, 0)
    into next_votes
    from public.posts
    where id = target_post_id;
  end if;

  return coalesce(next_votes, 0);
end;
$$;

create or replace function public.unlike_community_post(target_post_id uuid, p_expected_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  next_votes integer;
begin
  if current_user_id is null then
    raise exception 'Sign in to unlike discussions.' using errcode = '28000';
  end if;

  if p_expected_user_id is distinct from current_user_id then
    raise exception 'Your session changed. Please try again.' using errcode = '42501';
  end if;

  if not exists (select 1 from public.posts where id = target_post_id) then
    raise exception 'Discussion not found.' using errcode = 'P0002';
  end if;

  delete from public.post_likes
  where post_id = target_post_id
    and user_id = current_user_id;

  if found then
    update public.posts
    set votes = greatest(coalesce(votes, 0) - 1, 0)
    where id = target_post_id
    returning votes into next_votes;
  else
    select coalesce(votes, 0)
    into next_votes
    from public.posts
    where id = target_post_id;
  end if;

  return coalesce(next_votes, 0);
end;
$$;

revoke execute on function public.like_community_post(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.unlike_community_post(uuid, uuid) from public, anon, authenticated;
grant execute on function public.like_community_post(uuid, uuid) to authenticated;
grant execute on function public.unlike_community_post(uuid, uuid) to authenticated;

-- Ownership RLS validates these explicit identities against the request JWT.
grant insert (user_id) on public.post_saves to authenticated;
grant insert (reporter_id) on public.post_reports to authenticated;

-- Match the source limit while allowing replay after it already exists.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.comments'::regclass
      and conname = 'comments_body_length_check'
  ) then
    alter table public.comments
      add constraint comments_body_length_check
      check (body is null or char_length(body) <= 2000);
  end if;
end;
$$;

comment on constraint comments_body_length_check on public.comments is
  'Comment bodies allow at most 2000 Unicode code points, including whitespace; NULL and empty bodies remain allowed.';

-- Community Storage policy subset only; keep every avatar policy untouched.
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

notify pgrst, 'reload schema';

commit;
