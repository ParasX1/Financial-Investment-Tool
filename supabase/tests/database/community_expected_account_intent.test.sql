begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select no_plan();

insert into auth.users (id, email) values
  ('31313131-3131-4131-8131-313131313131', 'intent-a@fit.test'),
  ('32323232-3232-4232-8232-323232323232', 'intent-b@fit.test');
insert into public.posts (id, title, author_id) values
  ('33333333-3333-4333-8333-333333333333', 'Shared discussion', '31313131-3131-4131-8131-313131313131');

select is((select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname='create_community_post_with_tickers'), 1::bigint,
  'create has one unambiguous signature');
select is((select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname in ('like_community_post','unlike_community_post')), 2::bigint,
  'each like action has one signature');
select ok(not has_column_privilege('authenticated','public.post_reports','status','INSERT'), 'browser cannot choose report status');
select ok(not has_column_privilege('authenticated','public.posts','votes','INSERT'), 'browser cannot choose votes');

set local role anon;
set local request.jwt.claims = '{}';
select throws_ok($$select * from public.create_community_post_with_tickers('31313131-3131-4131-8131-313131313131','A draft','Body','{}','discussion',null,'{}',null,null,null)$$,
  '42501', null, 'anon cannot create');
select throws_ok($$select public.like_community_post('33333333-3333-4333-8333-333333333333','31313131-3131-4131-8131-313131313131')$$,
  '42501', null, 'anon cannot like');
select throws_ok($$select public.unlike_community_post('33333333-3333-4333-8333-333333333333','31313131-3131-4131-8131-313131313131')$$,
  '42501', null, 'anon cannot unlike');

set local role authenticated;
set local request.jwt.claims = '{"sub":"31313131-3131-4131-8131-313131313131","role":"authenticated"}';
select lives_ok($$select * from public.create_community_post_with_tickers('31313131-3131-4131-8131-313131313131','Owner draft','Body','{}','discussion',null,'{AAPL,NVDA}',null,null,null)$$,
  'expected owner creates ordered tickers atomically');
select is((select count(*) from public.post_tickers), 2::bigint, 'owner create writes both tickers');
select is(public.like_community_post('33333333-3333-4333-8333-333333333333','31313131-3131-4131-8131-313131313131'),1,'owner likes');
select is(public.like_community_post('33333333-3333-4333-8333-333333333333','31313131-3131-4131-8131-313131313131'),1,'owner repeat like is idempotent');
select lives_ok($$insert into public.post_saves(post_id,user_id) values ('33333333-3333-4333-8333-333333333333','31313131-3131-4131-8131-313131313131')$$,'owner saves with explicit identity');
select lives_ok($$insert into public.post_reports(post_id,reporter_id,reason) values ('33333333-3333-4333-8333-333333333333','31313131-3131-4131-8131-313131313131','other')$$,'owner reports with explicit identity');

-- Same owner with refreshed JWT claims retains the intent.
set local request.jwt.claims = '{"sub":"31313131-3131-4131-8131-313131313131","role":"authenticated","iat":2000000000}';
select is(public.unlike_community_post('33333333-3333-4333-8333-333333333333','31313131-3131-4131-8131-313131313131'),0,'same-owner refresh can unlike');
select is(public.like_community_post('33333333-3333-4333-8333-333333333333','31313131-3131-4131-8131-313131313131'),1,'same-owner refresh can like');

-- The request now carries B's JWT while the operation retains A's intent.
set local request.jwt.claims = '{"sub":"32323232-3232-4232-8232-323232323232","role":"authenticated"}';
select throws_ok($$select * from public.create_community_post_with_tickers('31313131-3131-4131-8131-313131313131','A switched draft','Body','{}','discussion',null,'{MSFT}',null,null,null)$$,
  '42501','Your session changed. Please try again.','switched JWT cannot publish A draft as B');
select throws_ok($$select public.like_community_post('33333333-3333-4333-8333-333333333333','31313131-3131-4131-8131-313131313131')$$,
  '42501','Your session changed. Please try again.','switched JWT cannot like as B');
select throws_ok($$select public.unlike_community_post('33333333-3333-4333-8333-333333333333','31313131-3131-4131-8131-313131313131')$$,
  '42501','Your session changed. Please try again.','switched JWT cannot unlike as B');
select throws_ok($$insert into public.post_saves(post_id,user_id) values ('33333333-3333-4333-8333-333333333333','31313131-3131-4131-8131-313131313131')$$,
  '42501',null,'switched JWT cannot save for A');
select throws_ok($$insert into public.post_reports(post_id,reporter_id,reason) values ('33333333-3333-4333-8333-333333333333','31313131-3131-4131-8131-313131313131','other')$$,
  '42501',null,'switched JWT cannot report for A');
select throws_ok($$select public.like_community_post('33333333-3333-4333-8333-333333333333',null)$$,
  '42501','Your session changed. Please try again.','null expected owner cannot like');
select throws_ok($$select * from public.create_community_post_with_tickers(null,'Missing owner','Body','{}','discussion',null,'{}',null,null,null)$$,
  '42501','Your session changed. Please try again.','null expected author cannot create');
select is((select count(*) from public.posts where author_id=auth.uid()),0::bigint,'B received no A post');
select is((select count(*) from public.post_likes),0::bigint,'B received no A like');
select is((select count(*) from public.post_saves),0::bigint,'B received no A save');
select is((select count(*) from public.post_reports),0::bigint,'B received no A report');
select is((select votes from public.posts where id='33333333-3333-4333-8333-333333333333'),1,'mismatch leaves vote count unchanged');
select is((select count(*) from public.post_tickers),2::bigint,'mismatch leaves ticker count unchanged');

set local request.jwt.claims = '{}';
select throws_ok($$select public.like_community_post('33333333-3333-4333-8333-333333333333','31313131-3131-4131-8131-313131313131')$$,
  '28000','Sign in to like discussions.','authenticated role without JWT cannot like');
select throws_ok($$select * from public.create_community_post_with_tickers('31313131-3131-4131-8131-313131313131','No JWT','Body','{}','discussion',null,'{}',null,null,null)$$,
  'P0001','Authentication is required.','authenticated role without JWT cannot create');
select * from finish();
rollback;
