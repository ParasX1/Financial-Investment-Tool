-- Reconcile confirmed missing hosted effects without replaying historical SQL.
-- Existing canonical avatar ownership policies are intentionally preserved.
set local lock_timeout = '3s';
set local statement_timeout = '30s';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars', 'avatars', true, 5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

alter policy "Users can create their own profile" on public.profiles
  to authenticated
  with check ((select auth.uid()) = id);

alter policy "Users can update their own profile" on public.profiles
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create index if not exists comments_author_id_idx
  on public.comments (author_id);
create index if not exists comments_post_id_idx
  on public.comments (post_id);
create index if not exists posts_author_id_idx
  on public.posts (author_id);
