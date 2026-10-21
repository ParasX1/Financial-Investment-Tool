-- Persist one like per authenticated user and discussion.
-- The votes number remains denormalized on posts for the existing UI, but it
-- is now changed through RPC functions instead of direct client updates.

create table if not exists public.post_likes (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamp with time zone default now(),
  constraint post_likes_pkey primary key (post_id, user_id)
);

alter table public.post_likes enable row level security;

drop policy if exists "Users can read their own community post likes" on public.post_likes;
create policy "Users can read their own community post likes"
  on public.post_likes
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Community post votes can be updated" on public.posts;
revoke update on public.posts from anon, authenticated;
revoke update (votes) on public.posts from anon, authenticated;
revoke all on public.post_likes from anon, authenticated;
grant select on public.post_likes to authenticated;
grant all on public.post_likes to service_role;

create or replace function public.like_community_post(target_post_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  next_votes integer;
begin
  if current_user_id is null then
    raise exception 'Sign in to like discussions.' using errcode = '28000';
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

create or replace function public.unlike_community_post(target_post_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  next_votes integer;
begin
  if current_user_id is null then
    raise exception 'Sign in to unlike discussions.' using errcode = '28000';
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

revoke all on function public.like_community_post(uuid) from public;
revoke all on function public.unlike_community_post(uuid) from public;
grant execute on function public.like_community_post(uuid) to authenticated;
grant execute on function public.unlike_community_post(uuid) to authenticated;
