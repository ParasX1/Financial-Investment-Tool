-- Persist one optional image attachment per Community discussion.
-- Image files are stored in the existing Community image bucket; this column
-- stores the public URL used by the frontend feed.

alter table public.posts
  add column if not exists image_url text;
