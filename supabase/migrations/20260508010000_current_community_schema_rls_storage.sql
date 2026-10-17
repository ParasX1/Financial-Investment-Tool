-- Bring the repository migrations in line with the current Community schema.
-- This is intentionally idempotent: it can repair an existing remote project
-- or create the missing Community tables when running Supabase locally.

create extension if not exists "pgcrypto" with schema "extensions";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text,
  last_name text,
  avatar_url text,
  updated_at timestamp with time zone default now()
);

create table if not exists public.tickers (
  id bigint generated always as identity primary key,
  symbol text not null,
  name text,
  industry text
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  votes integer default 0,
  created_at timestamp with time zone default now(),
  author_id uuid references auth.users(id) on delete set null
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references public.posts(id) on delete cascade,
  user_name text,
  body text,
  image_url text,
  created_at timestamp with time zone default now(),
  author_id uuid references auth.users(id) on delete set null
);

alter table public.profiles add column if not exists first_name text;
alter table public.profiles add column if not exists last_name text;
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists updated_at timestamp with time zone default now();

alter table public.tickers add column if not exists symbol text;
alter table public.tickers add column if not exists name text;
alter table public.tickers add column if not exists industry text;

alter table public.posts add column if not exists title text;
alter table public.posts add column if not exists votes integer default 0;
alter table public.posts add column if not exists created_at timestamp with time zone default now();
alter table public.posts add column if not exists author_id uuid references auth.users(id) on delete set null;
alter table public.posts alter column author_id set default auth.uid();

alter table public.comments add column if not exists post_id uuid references public.posts(id) on delete cascade;
alter table public.comments add column if not exists user_name text;
alter table public.comments add column if not exists body text;
alter table public.comments add column if not exists image_url text;
alter table public.comments add column if not exists created_at timestamp with time zone default now();
alter table public.comments add column if not exists author_id uuid references auth.users(id) on delete set null;
alter table public.comments alter column author_id set default auth.uid();

alter table public.profiles enable row level security;
alter table public.tickers enable row level security;
alter table public.posts enable row level security;
alter table public.comments enable row level security;

drop policy if exists "Profiles are readable" on public.profiles;
drop policy if exists "Users can create their own profile" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Profiles are readable" on public.profiles for select using (true);
create policy "Users can create their own profile" on public.profiles for insert with check (auth.uid() = id);
create policy "Users can update their own profile" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "Tickers are readable" on public.tickers;
create policy "Tickers are readable" on public.tickers for select using (true);

drop policy if exists "Community posts are readable" on public.posts;
drop policy if exists "Community posts can be created" on public.posts;
drop policy if exists "Community post authors can delete" on public.posts;
drop policy if exists "Community post votes can be updated" on public.posts;
create policy "Community posts are readable" on public.posts for select using (true);
create policy "Community posts can be created" on public.posts for insert with check (author_id is null or auth.uid() = author_id);
create policy "Community post authors can delete" on public.posts for delete using (auth.uid() = author_id);
create policy "Community post votes can be updated" on public.posts for update using (true) with check (true);

drop policy if exists "Community comments are readable" on public.comments;
drop policy if exists "Community comments can be created" on public.comments;
drop policy if exists "Community comment authors can delete" on public.comments;
create policy "Community comments are readable" on public.comments for select using (true);
create policy "Community comments can be created" on public.comments for insert with check (author_id is null or auth.uid() = author_id);
create policy "Community comment authors can delete" on public.comments for delete using (
  auth.uid() = author_id
  or exists (
    select 1
    from public.posts
    where posts.id = comments.post_id
      and posts.author_id = auth.uid()
  )
);

grant select on public.profiles, public.tickers, public.posts, public.comments to anon, authenticated;
revoke update on public.posts from anon, authenticated;
revoke update on public.comments from anon, authenticated;
grant insert, delete on public.posts, public.comments to anon, authenticated;
grant update (votes) on public.posts to anon, authenticated;
grant insert, update on public.profiles to authenticated;
grant all on public.profiles, public.tickers, public.posts, public.comments to service_role;

do $$
begin
  if to_regclass('storage.buckets') is not null then
    execute $storage$
      insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
      values (
        'comment-images',
        'comment-images',
        true,
        5242880,
        array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
      )
      on conflict (id) do update
        set public = excluded.public,
            file_size_limit = excluded.file_size_limit,
            allowed_mime_types = excluded.allowed_mime_types
    $storage$;
  end if;

  if to_regclass('storage.objects') is not null then
    execute 'drop policy if exists "Community comment images are readable" on storage.objects';
    execute 'drop policy if exists "Authenticated users can upload community comment images" on storage.objects';
    execute 'drop policy if exists "Community comment image owners can update" on storage.objects';
    execute 'drop policy if exists "Community comment image owners can delete" on storage.objects';

    execute 'create policy "Community comment images are readable" on storage.objects for select using (bucket_id = ''comment-images'')';
    execute 'create policy "Authenticated users can upload community comment images" on storage.objects for insert to authenticated with check (bucket_id = ''comment-images'')';
    execute 'create policy "Community comment image owners can update" on storage.objects for update to authenticated using (bucket_id = ''comment-images'' and owner = auth.uid()) with check (bucket_id = ''comment-images'' and owner = auth.uid())';
    execute 'create policy "Community comment image owners can delete" on storage.objects for delete to authenticated using (bucket_id = ''comment-images'' and owner = auth.uid())';
  end if;
end $$;
