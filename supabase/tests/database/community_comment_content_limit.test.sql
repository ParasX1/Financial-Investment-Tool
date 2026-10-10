begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select no_plan();

-- Synthetic fixtures only; every mutation, including role changes, rolls back.
insert into auth.users (id, email) values
  ('29200000-0000-4000-8000-000000000001', 'comment-limit@fit.test');
insert into public.posts (id, title, author_id) values
  ('29200000-0000-4000-8000-000000000002', 'Comment boundary fixture',
   '29200000-0000-4000-8000-000000000001');
-- An image-only comment references an existing object owned by its author.
insert into storage.objects (bucket_id, name, owner_id) values
  ('comment-images', 'comments/29200000-0000-4000-8000-000000000002/image.png',
   '29200000-0000-4000-8000-000000000001');

select ok(exists (
  select 1 from pg_constraint
  where conrelid = 'public.comments'::regclass
    and conname = 'comments_body_length_check' and convalidated
), 'the comment limit is a validated database constraint');
select is(current_setting('server_encoding'), 'UTF8', 'code-point controls run in UTF-8');
select is(char_length(repeat(chr(128512), 2000)), 2000, '2,000 emoji are 2,000 SQL characters');
select is(octet_length(repeat(chr(128512), 2000)), 8000, 'the limit is characters, not UTF-8 bytes');
select is(char_length(repeat('e' || chr(769), 1000)), 2000, 'combining marks count as separate code points');

set local request.jwt.claim.sub = '29200000-0000-4000-8000-000000000001';
set local role authenticated;

select lives_ok($$insert into public.comments (post_id, body) values
  ('29200000-0000-4000-8000-000000000002', repeat('x', 2000))$$,
  'authenticated accepts exactly 2,000 ASCII characters');
select lives_ok($$insert into public.comments (post_id, body) values
  ('29200000-0000-4000-8000-000000000002', repeat(chr(30028), 2000))$$,
  'authenticated accepts exactly 2,000 multibyte BMP characters');
select lives_ok($$insert into public.comments (post_id, body) values
  ('29200000-0000-4000-8000-000000000002', repeat(chr(128512), 2000))$$,
  'authenticated accepts exactly 2,000 astral characters');
select lives_ok($$insert into public.comments (post_id, body) values
  ('29200000-0000-4000-8000-000000000002', repeat('e' || chr(769), 1000))$$,
  'authenticated accepts 2,000 code points with combining marks');
select lives_ok($$insert into public.comments (post_id, body) values
  ('29200000-0000-4000-8000-000000000002', repeat(' ', 2000))$$,
  'authenticated preserves the whitespace-only contract at the limit');
select lives_ok($$insert into public.comments (post_id, body) values
  ('29200000-0000-4000-8000-000000000002', '')$$,
  'authenticated preserves empty bodies');
select lives_ok($$insert into public.comments (post_id, body, image_path) values
  ('29200000-0000-4000-8000-000000000002', null, 'comments/29200000-0000-4000-8000-000000000002/image.png')$$,
  'authenticated preserves NULL and image-only bodies');

select throws_ok($$insert into public.comments (post_id, body) values
  ('29200000-0000-4000-8000-000000000002', repeat('x', 2001))$$,
  '23514', null, 'direct authenticated insert rejects 2,001 ASCII characters');
select throws_ok($$insert into public.comments (post_id, body) values
  ('29200000-0000-4000-8000-000000000002', repeat(chr(30028), 2001))$$,
  '23514', null, 'direct authenticated insert rejects 2,001 BMP characters');
select throws_ok($$insert into public.comments (post_id, body) values
  ('29200000-0000-4000-8000-000000000002', repeat(chr(128512), 2001))$$,
  '23514', null, 'direct authenticated insert rejects 2,001 astral characters');
select throws_ok($$insert into public.comments (post_id, body) values
  ('29200000-0000-4000-8000-000000000002', repeat('e' || chr(769), 1000) || 'x')$$,
  '23514', null, 'direct authenticated insert rejects 2,001 code points with combining marks');
select throws_ok($$insert into public.comments (post_id, body) values
  ('29200000-0000-4000-8000-000000000002', repeat(' ', 2001))$$,
  '23514', null, 'whitespace counts toward the database limit');
select ok(exists (select 1 from public.comments
  where post_id = '29200000-0000-4000-8000-000000000002' and body = repeat(chr(128512), 2000)),
  'accepted Unicode text is stored without truncation or normalization');
select throws_ok($$update public.comments set body = repeat('x', 2001)
  where post_id = '29200000-0000-4000-8000-000000000002' and body = repeat('x', 2000)$$,
  '42501', null, 'browser role cannot bypass the existing comment update permission boundary');

set local role service_role;
select throws_ok($$insert into public.comments (post_id, body) values
  ('29200000-0000-4000-8000-000000000002', repeat('x', 2001))$$,
  '23514', null, 'RLS-bypass service role still obeys the length constraint');
select throws_ok($$update public.comments set body = repeat(chr(128512), 2001)
  where post_id = '29200000-0000-4000-8000-000000000002' and body = repeat('x', 2000)$$,
  '23514', null, 'updates also enforce the comment limit');
select ok(exists (select 1 from public.comments
  where post_id = '29200000-0000-4000-8000-000000000002' and body = repeat('x', 2000)),
  'a rejected update leaves the original comment intact');

set local role anon;
set local request.jwt.claim.sub = '';
select throws_ok($$insert into public.comments (post_id, body) values
  ('29200000-0000-4000-8000-000000000002', 'Anonymous reply')$$,
  '42501', null, 'the content constraint does not grant anonymous write access');

reset role;
select * from finish();
rollback;
