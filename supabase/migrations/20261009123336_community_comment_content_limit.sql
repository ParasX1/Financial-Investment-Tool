-- Match the client's Unicode code-point count with PostgreSQL UTF-8 char_length.
-- NULL, empty text, whitespace, and image-only comments keep their existing
-- meaning. Validate existing rows; an overlong row fails deployment without
-- rewriting or truncating any comment.
alter table public.comments
  add constraint comments_body_length_check
  check (body is null or char_length(body) <= 2000);

comment on constraint comments_body_length_check on public.comments is
  'Comment bodies allow at most 2000 Unicode code points, including whitespace; NULL and empty bodies remain allowed.';
