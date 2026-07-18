-- Community MVP research loop: explicit context, private saves, and a moderation queue.

alter table public.posts
  add column if not exists post_type text not null default 'discussion',
  add column if not exists time_frame text,
  add column if not exists symbol text,
  add column if not exists source_url text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.posts'::regclass
      and conname = 'posts_post_type_check'
  ) then
    alter table public.posts
      add constraint posts_post_type_check
      check (post_type in ('discussion', 'question', 'analysis', 'news', 'portfolio'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.posts'::regclass
      and conname = 'posts_time_frame_check'
  ) then
    alter table public.posts
      add constraint posts_time_frame_check
      check (time_frame is null or time_frame in ('short', 'medium', 'long'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.posts'::regclass
      and conname = 'posts_symbol_check'
  ) then
    alter table public.posts
      add constraint posts_symbol_check
      check (
        symbol is null
        or (
          symbol = upper(btrim(symbol))
          and symbol ~ '^[A-Z0-9][A-Z0-9.\-^=]{0,23}$'
        )
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.posts'::regclass
      and conname = 'posts_source_url_check'
  ) then
    alter table public.posts
      add constraint posts_source_url_check
      check (
        source_url is null
        or (
          source_url = btrim(source_url)
          and char_length(source_url) <= 2048
          and lower(source_url) ~ '^https?://'
        )
      );
  end if;
end
$$;

revoke insert on table public.posts from authenticated;
grant insert (
  title, body, tags, image_url, image_path, author_id,
  post_type, time_frame, symbol, source_url
) on table public.posts to authenticated;

create table if not exists public.post_saves (
  user_id uuid not null default auth.uid()
    references auth.users(id) on delete cascade,
  post_id uuid not null
    references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

alter table public.post_saves enable row level security;

drop policy if exists "Community saves are user-readable" on public.post_saves;
create policy "Community saves are user-readable"
  on public.post_saves
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Community saves are user-creatable" on public.post_saves;
create policy "Community saves are user-creatable"
  on public.post_saves
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Community saves are user-deletable" on public.post_saves;
create policy "Community saves are user-deletable"
  on public.post_saves
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

revoke all on table public.post_saves from public, anon, authenticated, service_role;
grant select, delete on table public.post_saves to authenticated;
grant insert (post_id) on table public.post_saves to authenticated;
grant all on table public.post_saves to service_role;

create index if not exists post_saves_post_id_idx
  on public.post_saves(post_id);

create table if not exists public.post_reports (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null
    references public.posts(id) on delete cascade,
  reporter_id uuid not null default auth.uid()
    references auth.users(id) on delete cascade,
  reason text not null,
  details text,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  constraint post_reports_reason_check check (
    reason in (
      'spam_or_scam',
      'misleading_financial_claim',
      'market_manipulation',
      'harassment',
      'other'
    )
  ),
  constraint post_reports_details_check check (
    details is null or char_length(details) <= 500
  ),
  constraint post_reports_status_check check (
    status in ('pending', 'reviewed', 'dismissed', 'actioned')
  ),
  unique (reporter_id, post_id)
);

alter table public.post_reports enable row level security;

drop policy if exists "Community reports are user-readable" on public.post_reports;
create policy "Community reports are user-readable"
  on public.post_reports
  for select
  to authenticated
  using ((select auth.uid()) = reporter_id);

drop policy if exists "Community reports are user-creatable" on public.post_reports;
create policy "Community reports are user-creatable"
  on public.post_reports
  for insert
  to authenticated
  with check ((select auth.uid()) = reporter_id);

revoke all on table public.post_reports from public, anon, authenticated, service_role;
grant select on table public.post_reports to authenticated;
grant insert (post_id, reason, details) on table public.post_reports to authenticated;
grant all on table public.post_reports to service_role;

create index if not exists post_reports_post_id_idx
  on public.post_reports(post_id);

create index if not exists post_reports_pending_created_at_idx
  on public.post_reports(created_at)
  where status = 'pending';

create index if not exists post_likes_user_id_idx
  on public.post_likes(user_id);

drop policy if exists "Users can read their own community post likes" on public.post_likes;
drop policy if exists "Community likes are user-readable" on public.post_likes;
create policy "Community likes are user-readable"
  on public.post_likes
  for select
  to authenticated
  using ((select auth.uid()) = user_id);
