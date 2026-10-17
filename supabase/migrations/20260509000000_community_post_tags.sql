-- Persist selected Community discussion tags.
-- The frontend still falls back to local inferred tags for older schemas or
-- rows where tags are unavailable.

alter table public.posts
  add column if not exists tags text[] not null default '{}';
