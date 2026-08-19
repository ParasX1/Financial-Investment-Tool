-- Keep Community text posts portable: store source Markdown, never rendered HTML.
comment on column public.posts.body is
  'Raw Markdown source for Community posts. Plain text remains valid Markdown.';

alter table public.posts
  drop constraint if exists posts_title_length_check;

alter table public.posts
  add constraint posts_title_length_check
  check (
    char_length(btrim(title)) between 1 and 300
  );

alter table public.posts
  drop constraint if exists posts_body_length_check;

alter table public.posts
  add constraint posts_body_length_check
  check (
    body is null
    or char_length(body) <= 40000
  );
