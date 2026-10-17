do $$
begin
  if to_regclass('public.posts') is not null then
    execute 'alter table public.posts enable row level security';

    execute 'drop policy if exists "Community posts are readable" on public.posts';
    execute 'drop policy if exists "Community posts can be created" on public.posts';
    execute 'drop policy if exists "Community post authors can delete" on public.posts';
    execute 'drop policy if exists "Community post votes can be updated" on public.posts';

    execute 'create policy "Community posts are readable" on public.posts for select using (true)';
    execute 'create policy "Community posts can be created" on public.posts for insert with check (author_id is null or auth.uid() = author_id)';
    execute 'create policy "Community post authors can delete" on public.posts for delete using (auth.uid() = author_id)';
    execute 'create policy "Community post votes can be updated" on public.posts for update using (true) with check (true)';
  end if;

  if to_regclass('public.comments') is not null then
    if not exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'comments'
        and column_name = 'author_id'
    ) then
      execute 'alter table public.comments add column author_id uuid references auth.users(id) on delete set null';
    end if;

    execute 'alter table public.comments enable row level security';

    execute 'drop policy if exists "Community comments are readable" on public.comments';
    execute 'drop policy if exists "Community comments can be created" on public.comments';
    execute 'drop policy if exists "Community comment authors can delete" on public.comments';

    execute 'create policy "Community comments are readable" on public.comments for select using (true)';
    execute 'create policy "Community comments can be created" on public.comments for insert with check (author_id is null or auth.uid() = author_id)';
    execute 'create policy "Community comment authors can delete" on public.comments for delete using (
      auth.uid() = author_id
      or exists (
        select 1
        from public.posts
        where posts.id = comments.post_id
          and posts.author_id = auth.uid()
      )
    )';
  end if;
end $$;
