-- Store discussion title and body separately.
-- Existing posts remain compatible because the frontend falls back to the
-- legacy title-splitting behaviour when body is null.

alter table public.posts
  add column if not exists body text;
