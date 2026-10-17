-- Tighten Community write permissions after ownership metadata became required.
-- Remote posts/comments should be created by authenticated users only, with
-- author_id matching auth.uid(). Signed-out users remain local-only in the app.

do $$
begin
  if to_regclass('public.posts') is not null then
    execute 'drop policy if exists "Community posts can be created" on public.posts';
    execute 'create policy "Community posts can be created" on public.posts for insert to authenticated with check (auth.uid() = author_id)';
  end if;

  if to_regclass('public.comments') is not null then
    execute 'drop policy if exists "Community comments can be created" on public.comments';
    execute 'create policy "Community comments can be created" on public.comments for insert to authenticated with check (auth.uid() = author_id)';
  end if;

  execute 'revoke insert on public.posts from anon';
  execute 'revoke insert on public.comments from anon';

  if to_regclass('storage.objects') is not null then
    execute 'drop policy if exists "Authenticated users can upload community comment images" on storage.objects';
    execute 'drop policy if exists "Authenticated users can upload community images" on storage.objects';
    execute 'create policy "Authenticated users can upload community images" on storage.objects for insert to authenticated with check (
      bucket_id = ''comment-images''
      and (
        name like ''posts/%''
        or name like ''comments/%''
      )
    )';
  end if;
end $$;
