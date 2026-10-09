begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select no_plan();

insert into auth.users (id, email) values
  ('11111111-1111-4111-8111-111111111111', 'owner@fit.test'),
  ('22222222-2222-4222-8222-222222222222', 'other@fit.test');
insert into public.posts (id, title, author_id, symbol) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Owner discussion', '11111111-1111-4111-8111-111111111111', 'BHP.AX'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Other discussion', '22222222-2222-4222-8222-222222222222', null);
insert into public.post_tickers (post_id, symbol, position) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'BHP.AX', 0);
insert into public.comments (id, post_id, body, author_id) values
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Other comment', '22222222-2222-4222-8222-222222222222');
insert into public.profiles (id, first_name) values
  ('11111111-1111-4111-8111-111111111111', 'Owner');
insert into public.top_picks_universe (symbol, name, market, source, active) values
  ('HIDDEN', 'Inactive test symbol', 'US', 'MANUAL', false);

select ok((select bool_and(relrowsecurity) from pg_class where oid in (
  'public.posts'::regclass, 'public.comments'::regclass, 'public.profiles'::regclass,
  'public.post_likes'::regclass, 'public.post_saves'::regclass, 'public.post_reports'::regclass,
  'public.post_tickers'::regclass, 'public.tickers'::regclass, 'public.top_picks_universe'::regclass)),
  'community and reference tables enable RLS');

-- TRUNCATE, REFERENCES and TRIGGER bypass the row ownership policies.
select ok((select bool_and(not has_table_privilege(browser_role, table_name, privilege_name))
  from unnest(array['anon','authenticated']) as browser_role
  cross join unnest(array['public.posts','public.comments','public.profiles','public.tickers',
    'public.post_likes','public.post_tickers','public.post_saves','public.post_reports','public.top_picks_universe']) as table_name
  cross join unnest(array['TRUNCATE','REFERENCES','TRIGGER']) as privilege_name),
  'all community and reference tables deny browser privileges that bypass RLS');
select ok(not has_table_privilege('anon', 'public.profiles', 'INSERT'), 'anonymous has no public-profile insert grant');
select ok(not has_table_privilege('authenticated', 'public.tickers', 'INSERT'), 'browser has no reference-ticker write grant');
select ok(not has_table_privilege('authenticated', 'public.top_picks_universe', 'INSERT'), 'browser has no curated-universe write grant');
create table public.future_grant_test (id integer);
create function public.future_function_test() returns integer language sql as 'select 1';
select ok(not has_table_privilege('anon', 'public.future_grant_test', 'SELECT'),
  'future public tables require explicit anonymous grants');
select ok(not has_table_privilege('authenticated', 'public.future_grant_test', 'TRUNCATE'),
  'future public tables do not inherit browser TRUNCATE');
select ok(not has_function_privilege('anon', 'public.future_function_test()', 'EXECUTE'),
  'future functions require explicit anonymous execute grants');
select ok(not has_function_privilege('authenticated', 'public.future_function_test()', 'EXECUTE'),
  'future functions require explicit authenticated execute grants');

set local role anon;
set local request.jwt.claims = '{}';
select is((select count(*) from public.posts), 2::bigint, 'anonymous reads public posts');
select is((select count(*) from public.comments), 1::bigint, 'anonymous reads public comments');
select is((select count(*) from public.profiles), 1::bigint, 'anonymous reads public identity fields');
select is((select count(*) from public.post_tickers), 1::bigint, 'anonymous reads public post tickers');
select is((select count(*) from public.top_picks_universe where symbol = 'HIDDEN'), 0::bigint,
  'anonymous cannot read inactive curated symbols');
select throws_ok($$insert into public.posts (title) values ('Anonymous')$$, '42501', null, 'anonymous cannot create a post');
select throws_ok($$insert into public.comments (body) values ('Anonymous')$$, '42501', null, 'anonymous cannot create a comment');
select throws_ok($$select public.like_community_post('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')$$,
  '42501', null, 'anonymous cannot execute like RPC');
select throws_ok($$select * from public.create_community_post_with_tickers('Title', null, '{}', 'discussion', null, '{}', null, null, null)$$,
  '42501', null, 'anonymous cannot execute post creation RPC');

set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}';
select lives_ok($$update public.profiles set first_name = 'Updated' where id = auth.uid()$$, 'owner can update public profile');
select throws_ok($$update public.profiles set id = '22222222-2222-4222-8222-222222222222' where id = auth.uid()$$,
  '42501', null, 'public profile cannot be reassigned');
select throws_ok($$insert into public.profiles (id) values ('22222222-2222-4222-8222-222222222222')$$,
  '42501', null, 'public profile cannot be forged for another user');
select throws_ok($$update public.posts set votes = 999 where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'$$,
  '42501', null, 'browser cannot directly forge votes');
select throws_ok($$insert into public.posts (title, author_id) values ('Forged', '22222222-2222-4222-8222-222222222222')$$,
  '42501', null, 'post authorship cannot be forged');
select throws_ok($$insert into public.comments (post_id, body, author_id) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Forged', '22222222-2222-4222-8222-222222222222')$$,
  '42501', null, 'comment authorship cannot be forged');
select results_eq($$with removed as (delete from public.posts where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' returning id) select count(*) from removed$$,
  array[0::bigint], 'owner cannot delete another user post');
select results_eq($$with removed as (delete from public.comments where id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc' returning id) select count(*) from removed$$,
  array[0::bigint], 'post owner cannot delete a comment authored by another user');

select is(public.like_community_post('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'), 1, 'like RPC adds one vote');
select is(public.like_community_post('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'), 1, 'repeating a like is idempotent');
select is((select count(*) from public.post_likes), 1::bigint, 'owner sees their like');
select throws_ok($$insert into public.post_likes (post_id, user_id) values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', auth.uid())$$,
  '42501', null, 'likes require the RPC instead of direct writes');
select throws_ok($$select public.like_community_post('dddddddd-dddd-4ddd-8ddd-dddddddddddd')$$,
  'P0002', 'Discussion not found.', 'like RPC rejects a missing post');

set local request.jwt.claims = '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}';
select is((select count(*) from public.post_likes), 0::bigint, 'other user cannot read owner likes');
select is(public.unlike_community_post('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'), 1, 'other user cannot remove owner like');
select is(public.like_community_post('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'), 2, 'another user can independently like the same post');
select results_eq($$with changed as (update public.profiles set first_name = 'Attack' where id = '11111111-1111-4111-8111-111111111111' returning id) select count(*) from changed$$,
  array[0::bigint], 'other user cannot update owner public profile');
select throws_ok($$insert into public.post_tickers (post_id, symbol, position) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'CBA.AX', 1)$$,
  '42501', null, 'other user cannot attach tickers to owner post');

set local request.jwt.claims = '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}';
select is(public.unlike_community_post('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'), 1, 'unlike removes only the calling user vote');
select is(public.unlike_community_post('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'), 1, 'repeating unlike is idempotent');
select lives_ok($$select * from public.create_community_post_with_tickers('RPC created', 'Research body', '{}', 'analysis', 'long', array['BHP.AX','CBA.AX'], null, null, null)$$,
  'post RPC creates a post and ordered tickers atomically');
set constraints all immediate;
select is((select author_id from public.posts where title = 'RPC created'), auth.uid(), 'RPC uses JWT owner');
select is((select count(*) from public.post_tickers where post_id = (select id from public.posts where title = 'RPC created')),
  2::bigint, 'post RPC persists both tickers');
select throws_ok($$select * from public.create_community_post_with_tickers('Invalid RPC', null, '{}', 'discussion', null, array['BHP.AX','BHP.AX'], null, null, null)$$,
  'P0001', 'Ticker symbols must be unique.', 'post RPC rejects duplicate tickers');
select is((select count(*) from public.posts where title = 'Invalid RPC'), 0::bigint, 'failed RPC leaves no partial post');

select lives_ok($$insert into public.post_saves (post_id) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')$$, 'owner can save a post');
select lives_ok($$insert into public.post_reports (post_id, reason) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'other')$$, 'owner can report a post');
select throws_ok($$update public.post_reports set status = 'actioned'$$, '42501', null, 'browser cannot make a moderation decision');
set local request.jwt.claims = '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}';
select is((select count(*) from public.post_saves), 0::bigint, 'other user cannot read owner saves');
select is((select count(*) from public.post_reports), 0::bigint, 'other user cannot read owner reports');
select results_eq($$with removed as (delete from public.comments where id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc' returning id) select count(*) from removed$$,
  array[1::bigint], 'comment author can delete own comment');

set local request.jwt.claims = '{}';
select throws_ok($$select public.like_community_post('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')$$,
  '28000', 'Sign in to like discussions.', 'like definer rejects a role without a JWT subject');
select throws_ok($$select * from public.create_community_post_with_tickers('No subject', null, '{}', 'discussion', null, '{}', null, null, null)$$,
  'P0001', 'Authentication is required.', 'post RPC rejects a role without a JWT subject');
-- Keep destructive privilege probes last so an expected red failure cannot
-- erase fixtures used by the independent ownership cases above.
set local role anon;
select throws_ok($$truncate public.profiles$$, '42501', null, 'anonymous cannot truncate public profiles');
select throws_ok($$truncate public.top_picks_universe$$, '42501', null, 'anonymous cannot truncate the curated universe');
reset role;
select * from finish();
rollback;
