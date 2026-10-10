-- Store Supabase Storage object paths so Community image files can be cleaned
-- up when their related discussion or comment is deleted.

alter table public.posts
  add column if not exists image_path text;

alter table public.comments
  add column if not exists image_path text;

do $$
begin
  if to_regclass('storage.objects') is not null then
    execute 'drop policy if exists "Community discussion owners can delete comment images" on storage.objects';
    execute 'create policy "Community discussion owners can delete comment images" on storage.objects for delete to authenticated using (
      bucket_id = ''comment-images''
      and name like ''comments/%''
      and exists (
        select 1
        from public.posts
        where posts.id::text = split_part(name, ''/'', 2)
          and posts.author_id = auth.uid()
      )
    )';
  end if;
end $$;
