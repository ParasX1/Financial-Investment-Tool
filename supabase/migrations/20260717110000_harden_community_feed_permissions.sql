-- Reconcile Community Feed privileges with the browser API actually used by
-- the app. TRUNCATE, REFERENCES, and TRIGGER are table privileges that RLS
-- does not protect, so browser roles must not inherit broad historical grants.

begin;

alter table public.posts enable row level security;
alter table public.comments enable row level security;

revoke all on table public.posts from public, anon, authenticated;
revoke all on table public.comments from public, anon, authenticated;

grant select on table public.posts, public.comments to anon;
grant select, delete on table public.posts, public.comments to authenticated;
grant insert (title, body, tags, image_url, image_path, author_id)
  on table public.posts to authenticated;
grant insert (post_id, body, image_url, image_path, author_id)
  on table public.comments to authenticated;

drop policy if exists "Community posts can be created" on public.posts;
create policy "Community posts can be created"
  on public.posts
  for insert
  to authenticated
  with check ((select auth.uid()) = author_id);

drop policy if exists "Community post authors can delete" on public.posts;
create policy "Community post authors can delete"
  on public.posts
  for delete
  to authenticated
  using ((select auth.uid()) = author_id);

drop policy if exists "Community comments can be created" on public.comments;
create policy "Community comments can be created"
  on public.comments
  for insert
  to authenticated
  with check ((select auth.uid()) = author_id);

drop policy if exists "Community comment authors can delete" on public.comments;
create policy "Community comment authors can delete"
  on public.comments
  for delete
  to authenticated
  using ((select auth.uid()) = author_id);

revoke execute on function public.like_community_post(uuid) from public, anon;
revoke execute on function public.unlike_community_post(uuid) from public, anon;
grant execute on function public.like_community_post(uuid) to authenticated;
grant execute on function public.unlike_community_post(uuid) to authenticated;

-- The bucket is public, so object URLs remain readable without granting the
-- browser roles permission to enumerate every stored Community image.
drop policy if exists "Community comment images are readable" on storage.objects;

commit;
