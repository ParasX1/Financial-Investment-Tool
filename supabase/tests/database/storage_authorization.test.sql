begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
-- Supabase Storage guards direct DELETE to prevent orphaned physical files.
-- These synthetic metadata fixtures have no physical object; this setting is
-- transaction-local and used only to exercise the actual ownership policies.
set local storage.allow_delete_query = 'true';
select no_plan();

insert into auth.users (id, email) values
  ('11111111-1111-4111-8111-111111111111', 'owner@fit.test'),
  ('22222222-2222-4222-8222-222222222222', 'other@fit.test');
insert into public.posts (id, title, author_id) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Storage ownership fixture', '11111111-1111-4111-8111-111111111111');
select results_eq($$select id, public, file_size_limit, allowed_mime_types from storage.buckets
  where id in ('avatars','comment-images') order by id$$,
  $$values ('avatars'::text, true, 5242880::bigint, array['image/jpeg','image/png','image/webp','image/gif']::text[]),
    ('comment-images'::text, true, 5242880::bigint, array['image/jpeg','image/png','image/webp','image/gif']::text[])$$,
  'both image buckets are public with a five MiB allowlisted image configuration');
select ok((select relrowsecurity from pg_class where oid = 'storage.objects'::regclass),
  'storage metadata uses RLS');

-- Fixtures mimic Storage's owner and owner_id fields, without real file writes.
insert into storage.objects (bucket_id, name, owner, owner_id) values
  ('avatars', '11111111-1111-4111-8111-111111111111/avatar', '11111111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111111'),
  ('avatars', '22222222-2222-4222-8222-222222222222/avatar', '22222222-2222-4222-8222-222222222222', '22222222-2222-4222-8222-222222222222'),
  ('comment-images', 'posts/owner.png', '11111111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111111'),
  ('comment-images', 'comments/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/comment.png', '22222222-2222-4222-8222-222222222222', '22222222-2222-4222-8222-222222222222');

set local role anon;
set local request.jwt.claims = '{}';
select is((select count(*) from storage.objects where bucket_id in ('avatars','comment-images')), 0::bigint,
  'anonymous cannot enumerate public bucket metadata');
select throws_ok($$insert into storage.objects (bucket_id, name) values ('comment-images','posts/anon.png')$$,
  '42501', null, 'anonymous cannot upload community image metadata');

set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}';
select is((select count(*) from storage.objects where bucket_id = 'avatars'), 1::bigint,
  'owner sees only own avatar record');
select is((select count(*) from storage.objects where bucket_id = 'comment-images'), 1::bigint,
  'owner sees only own community image records');
select lives_ok($$update storage.objects set metadata = '{"test":"upsert"}' where bucket_id = 'avatars'$$,
  'owner can replace own avatar metadata');
select throws_ok($$update storage.objects set owner_id = '22222222-2222-4222-8222-222222222222' where bucket_id = 'avatars'$$,
  '42501', null, 'avatar ownership cannot be transferred');
select throws_ok($$update storage.objects set name = '22222222-2222-4222-8222-222222222222/avatar' where bucket_id = 'avatars'$$,
  '42501', null, 'avatar path cannot be moved into another user namespace');
select throws_ok($$insert into storage.objects (bucket_id, name, owner_id) values ('avatars','11111111-1111-4111-8111-111111111111/extra','11111111-1111-4111-8111-111111111111')$$,
  '42501', null, 'avatar upload requires the canonical avatar path');
select throws_ok($$insert into storage.objects (bucket_id, name, owner, owner_id) values ('avatars','22222222-2222-4222-8222-222222222222/avatar2','11111111-1111-4111-8111-111111111111','11111111-1111-4111-8111-111111111111')$$,
  '42501', null, 'avatar cannot be uploaded into another namespace');
-- Delete the synthetic owned avatar so the following INSERT is not blocked
-- merely by uniqueness. A wrong-owner INSERT must fail because of RLS.
select results_eq($$with removed as (delete from storage.objects where bucket_id = 'avatars' returning id) select count(*) from removed$$,
  array[1::bigint], 'owner can delete own avatar metadata');
select throws_ok($$insert into storage.objects (bucket_id, name, owner, owner_id) values ('avatars','11111111-1111-4111-8111-111111111111/avatar','22222222-2222-4222-8222-222222222222','22222222-2222-4222-8222-222222222222')$$,
  '42501', null, 'avatar insert cannot forge another object owner');
select lives_ok($$insert into storage.objects (bucket_id, name, owner, owner_id) values ('avatars','11111111-1111-4111-8111-111111111111/avatar','11111111-1111-4111-8111-111111111111','11111111-1111-4111-8111-111111111111')$$,
  'owner can insert own canonical avatar');

select lives_ok($$insert into storage.objects (bucket_id, name, owner, owner_id) values ('comment-images','posts/new.png','11111111-1111-4111-8111-111111111111','11111111-1111-4111-8111-111111111111')$$,
  'owner can upload community image metadata');
select throws_ok($$insert into storage.objects (bucket_id, name, owner, owner_id) values ('comment-images','posts/forged.png','22222222-2222-4222-8222-222222222222','22222222-2222-4222-8222-222222222222')$$,
  '42501', null, 'community image insert cannot forge another owner');
select throws_ok($$insert into storage.objects (bucket_id, name, owner, owner_id) values ('comment-images','outside.png','11111111-1111-4111-8111-111111111111','11111111-1111-4111-8111-111111111111')$$,
  '42501', null, 'community uploads require an attachment namespace');
select lives_ok($$update storage.objects set metadata = '{"test":"update"}' where name = 'posts/owner.png'$$,
  'owner can update own community image');
select throws_ok($$update storage.objects set owner = '22222222-2222-4222-8222-222222222222', owner_id = '22222222-2222-4222-8222-222222222222' where name = 'posts/owner.png'$$,
  '42501', null, 'community object owner cannot be transferred');

set local request.jwt.claims = '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}';
select results_eq($$with changed as (update storage.objects set metadata = '{"test":"attack"}' where name = 'posts/owner.png' returning id) select count(*) from changed$$,
  array[0::bigint], 'other user cannot update owner community metadata');
select results_eq($$with removed as (delete from storage.objects where name = 'posts/owner.png' returning id) select count(*) from removed$$,
  array[0::bigint], 'other user cannot delete owner community metadata');
select results_eq($$with removed as (delete from storage.objects where name = '11111111-1111-4111-8111-111111111111/avatar' returning id) select count(*) from removed$$,
  array[0::bigint], 'other user cannot delete owner avatar');

set local request.jwt.claims = '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}';
-- DELETE without a row predicate does not need the SELECT visibility policy.
-- Assert the final owner contract independently of the filtered API query.
select lives_ok($$delete from storage.objects$$, 'unfiltered role-level deletion remains subject to DELETE RLS');
reset role;
select is((select count(*) from storage.objects where name = 'comments/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/comment.png'),
  1::bigint, 'post authorship does not authorize deleting another image owner metadata');

reset role;
select * from finish();
rollback;
