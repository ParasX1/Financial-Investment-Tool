drop policy if exists "Users can create their own profile"
  on public.profiles;
create policy "Users can create their own profile"
  on public.profiles
  for insert
  to authenticated
  with check ((select auth.uid()) = id);

drop policy if exists "Users can update their own profile"
  on public.profiles;
create policy "Users can update their own profile"
  on public.profiles
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create index if not exists comments_author_id_idx
  on public.comments (author_id);
create index if not exists comments_post_id_idx
  on public.comments (post_id);
create index if not exists posts_author_id_idx
  on public.posts (author_id);
