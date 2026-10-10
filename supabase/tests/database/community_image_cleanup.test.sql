begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select no_plan();
select ok(to_regclass('private.community_image_cleanup') is not null,
  'relational deletion has a durable private cleanup obligation');

insert into auth.users (id, email) values
 ('31111111-1111-4111-8111-111111111111', 'cleanup-owner@fit.test'),
 ('32222222-2222-4222-8222-222222222222', 'cleanup-other@fit.test');
insert into storage.objects (id, bucket_id, name, owner_id) values
 ('31111111-0000-4000-8000-000000000001','comment-images','posts/cleanup-shared.png','31111111-1111-4111-8111-111111111111'),
 ('31111111-0000-4000-8000-000000000002','comment-images','comments/3aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/cleanup-comment.png','32222222-2222-4222-8222-222222222222'),
 ('31111111-0000-4000-8000-000000000003','comment-images','posts/cleanup-removed.png','31111111-1111-4111-8111-111111111111'),
 ('31111111-0000-4000-8000-000000000004','comment-images','posts/cleanup-foreign.png','32222222-2222-4222-8222-222222222222'),
 ('31111111-0000-4000-8000-000000000005','avatars','31111111-1111-4111-8111-111111111111/avatar','31111111-1111-4111-8111-111111111111'),
 ('31111111-0000-4000-8000-000000000007','comment-images','posts/cleanup-fresh.png','31111111-1111-4111-8111-111111111111');
insert into public.posts (id,title,author_id,image_path) values
 ('3aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Cleanup primary','31111111-1111-4111-8111-111111111111','posts/cleanup-shared.png'),
 ('3bbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','Cleanup shared','31111111-1111-4111-8111-111111111111','posts/cleanup-shared.png'),
 ('3ccccccc-cccc-4ccc-8ccc-cccccccccccc','Cleanup removed','31111111-1111-4111-8111-111111111111','posts/cleanup-removed.png');
insert into public.comments (post_id,author_id,body,image_path) values
 ('3aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','32222222-2222-4222-8222-222222222222',null,
 'comments/3aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/cleanup-comment.png');

select ok((select relrowsecurity from pg_class where oid='private.community_image_cleanup'::regclass), 'tickets have RLS');
select ok((select bool_and(not has_table_privilege(r,'private.community_image_cleanup',p))
 from unnest(array['anon','authenticated']) r cross join unnest(array['SELECT','INSERT','UPDATE','DELETE','TRUNCATE']) p),
 'browser roles cannot read or mutate tickets');
select ok((select bool_and(not has_function_privilege(r,f,'EXECUTE'))
 from unnest(array['anon','authenticated']) r cross join unnest(array[
 'public.community_image_cleanup_list(integer)','public.community_image_cleanup_dispatch(bigint)',
 'public.community_image_cleanup_ack(bigint)','public.community_image_cleanup_error(bigint,text)']) f),
 'all worker RPCs deny anonymous and authenticated callers');
set local role anon;
select throws_ok($$select * from public.community_image_cleanup_list(10)$$,'42501',null,'anonymous worker RPC denied');
select throws_ok($$select * from private.community_image_cleanup$$,'42501',null,'anonymous ticket inventory denied');
set local role authenticated;
set local request.jwt.claims = '{"sub":"32222222-2222-4222-8222-222222222222","role":"authenticated"}';
select throws_ok($$select public.community_image_cleanup_ack(1)$$,'42501',null,'foreign worker ACK denied');
delete from public.posts where id='3aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
reset role;
select is((select count(*) from private.community_image_cleanup),0::bigint,'foreign post DELETE creates no tickets');
select throws_ok($$insert into public.posts(title,author_id,image_path) values
 ('Forged','31111111-1111-4111-8111-111111111111','posts/cleanup-foreign.png')$$,'23514',null,'forged owner attachment rejected');
select throws_ok($$insert into public.comments(post_id,author_id,image_path) values
 ('3bbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','32222222-2222-4222-8222-222222222222',
 'comments/3aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/cleanup-comment.png')$$,'23514',null,'comment path must match parent');
select lives_ok($$insert into public.comments(post_id,author_id,body) values
 ('3bbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','32222222-2222-4222-8222-222222222222','No attachment')$$,'nullable image contract preserved');

savepoint delete_rollback;
set local role authenticated;
set local request.jwt.claims = '{"sub":"31111111-1111-4111-8111-111111111111","role":"authenticated"}';
delete from public.posts where id='3aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
reset role;
select is((select count(*) from private.community_image_cleanup),1::bigint,'post DELETE enqueues other-author cascaded comment');
select is((select count(*) from private.community_image_cleanup where object_name='posts/cleanup-shared.png'),0::bigint,'shared reference prevents cleanup');
rollback to savepoint delete_rollback;
select is((select count(*) from private.community_image_cleanup),0::bigint,'rollback removes cleanup obligation');
select is((select count(*) from public.posts where id='3aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),1::bigint,'rollback restores parent');

set local role authenticated;
set local request.jwt.claims = '{"sub":"31111111-1111-4111-8111-111111111111","role":"authenticated"}';
delete from public.posts where id='3aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
delete from public.posts where id='3bbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
reset role;
select is((select count(*) from public.comments where post_id='3aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),0::bigint,'cross-author cascade removes relational comment');
select is((select count(*) from private.community_image_cleanup),2::bigint,'last shared reference creates exactly one reservation');
update public.posts set image_path=null where id='3ccccccc-cccc-4ccc-8ccc-cccccccccccc';
select is((select count(*) from private.community_image_cleanup where object_name='posts/cleanup-removed.png'),1::bigint,'removed OLD attachment is queued');
select is((select owner_id from private.community_image_cleanup where object_name like 'comments/%'),
 '32222222-2222-4222-8222-222222222222','ticket captures actual comment object owner');
select is((select count(*) from storage.objects where id='31111111-0000-4000-8000-000000000005'),1::bigint,'unrelated avatar survives');
select is((select count(*) from storage.objects where id='31111111-0000-4000-8000-000000000004'),1::bigint,'foreign image survives');

set local role authenticated;
set local request.jwt.claims = '{"sub":"31111111-1111-4111-8111-111111111111","role":"authenticated"}';
select throws_ok($$insert into storage.objects(bucket_id,name,owner_id) values
 ('comment-images','posts/cleanup-shared.png',auth.uid()::text) on conflict(bucket_id,name) do update set name=excluded.name$$,
 '42501',null,'pending path upsert denied');
with changed as (update storage.objects set name='posts/cleanup-removed.png'
 where name='posts/cleanup-shared.png' and bucket_id='comment-images' returning id)
select is((select count(*) from changed),0::bigint,'pending reserved object update affects zero rows');
select throws_ok($$update storage.objects set name='posts/cleanup-shared.png'
 where name='posts/cleanup-fresh.png' and bucket_id='comment-images'$$,'42501',null,'rename into pending path denied');
select throws_ok($$insert into public.posts(title,author_id,image_path) values
 ('Reattach',auth.uid(),'posts/cleanup-shared.png')$$,'23514',null,'pending path reattachment denied');
reset role;

-- Emulate a legacy forged OLD reference, using only transaction-local fixtures.
alter table public.posts disable trigger posts_validate_image_attachment;
insert into public.posts(title,author_id,image_path) values
 ('Legacy forged','31111111-1111-4111-8111-111111111111','posts/cleanup-foreign.png');
alter table public.posts enable trigger posts_validate_image_attachment;
delete from public.posts where title='Legacy forged';
select is((select count(*) from private.community_image_cleanup where object_name='posts/cleanup-foreign.png'),0::bigint,'forged OLD never authorizes foreign cleanup');

set local role service_role;
select throws_ok($$select * from public.community_image_cleanup_list(101)$$,'22023',null,'batch is bounded');
select is((select count(*) from public.community_image_cleanup_list(2)),2::bigint,'service worker lists bounded batch');
select is((select state from public.community_image_cleanup_dispatch((select id from public.community_image_cleanup_list(1)))),
 'ready','worker dispatches verified owner path');
reset role;
select is((select count(*) from private.community_image_cleanup where last_attempt_at is not null),1::bigint,'dispatch touches attempt time for fair retry');
select ok((select last_attempt_at is null from private.community_image_cleanup
 where id=(select id from public.community_image_cleanup_list(1))),'never-attempted ticket precedes permanent failure');
select is(public.community_image_cleanup_ack((select id from private.community_image_cleanup where object_name='posts/cleanup-shared.png')),false,'ACK refuses occupied path');

-- Rename only this metadata fixture to emulate path absence in the rolled-back
-- transaction. Never SQL-delete Storage metadata. API tests verify real bytes.
update storage.objects set name='posts/cleanup-native-archived.png'
 where id='31111111-0000-4000-8000-000000000001';
select is(public.community_image_cleanup_ack((select id from private.community_image_cleanup where object_name='posts/cleanup-shared.png')),true,'ACK confirms metadata absence');
select ok((select completed_at is not null and object_id is null and error_code is null from private.community_image_cleanup
 where object_name='posts/cleanup-shared.png'),'completion clears obsolete object metadata and diagnostics');
select public.community_image_cleanup_error((select id from private.community_image_cleanup where object_name='posts/cleanup-shared.png'),'ack_failed');
select ok((select error_code is null from private.community_image_cleanup where object_name='posts/cleanup-shared.png'),
 'lost ACK response cannot add stale diagnostic to completed absent path');
set local role authenticated;
set local request.jwt.claims = '{"sub":"31111111-1111-4111-8111-111111111111","role":"authenticated"}';
select throws_ok($$insert into storage.objects(bucket_id,name,owner_id) values
 ('comment-images','posts/cleanup-shared.png',auth.uid()::text)$$,'42501',null,'completed path INSERT denied');
select throws_ok($$update storage.objects set name='posts/cleanup-shared.png'
 where name='posts/cleanup-fresh.png' and bucket_id='comment-images'$$,'42501',null,'rename into completed path denied');
select throws_ok($$insert into public.posts(title,author_id,image_path) values
 ('Reattach completed',auth.uid(),'posts/cleanup-shared.png')$$,'23514',null,'completed path reattachment denied');
reset role;
insert into storage.objects(id,bucket_id,name,owner_id) values
 ('31111111-0000-4000-8000-000000000006','comment-images','posts/cleanup-shared.png','31111111-1111-4111-8111-111111111111');
select ok(exists(select 1 from public.community_image_cleanup_list(100) q join private.community_image_cleanup t on t.id=q.id
 where t.object_name='posts/cleanup-shared.png'),'late completed path restoration is eligible again');
select is((select state from public.community_image_cleanup_dispatch((select id from private.community_image_cleanup
 where object_name='posts/cleanup-shared.png'))),'ready','matching-owner replacement UUID remains captured-path retirement authority');
update storage.objects set owner_id='32222222-2222-4222-8222-222222222222' where id='31111111-0000-4000-8000-000000000006';
select is((select state from public.community_image_cleanup_dispatch((select id from private.community_image_cleanup
 where object_name='posts/cleanup-shared.png'))),'owner_mismatch','unexpected current owner replacement fails closed');
select is((select error_code from private.community_image_cleanup where object_name='posts/cleanup-shared.png'),
 'owner_mismatch','unexpected owner has bounded diagnostic');
select ok(exists(select 1 from public.community_image_cleanup_list(100) q join private.community_image_cleanup t on t.id=q.id
 where t.object_name='posts/cleanup-shared.png'),'occupied completed foreign path remains eligible for fail-closed diagnosis');
select throws_ok($$select public.community_image_cleanup_error(1,'raw secret or arbitrary diagnostic')$$,'22023',null,'diagnostics accept bounded codes only');

select * from finish();
rollback;
