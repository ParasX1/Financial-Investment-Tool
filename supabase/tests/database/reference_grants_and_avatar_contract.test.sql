-- Reference grant and avatar ownership contract. Every synthetic fixture rolls back.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
set local storage.allow_delete_query = 'true';
select no_plan();
select ok(current_setting('server_version_num')::int >= 170000, 'native PostgreSQL supports MAINTAIN');

select ok((select bool_and(has_table_privilege(r,t,'SELECT'))
  from unnest(array['anon','authenticated']) r
  cross join unnest(array['public.profiles','public.tickers','public.top_picks_universe']) t),
  'both browser roles retain all three reference SELECT grants');
select ok((select bool_and(not has_table_privilege(r,t,p))
  from unnest(array['anon','authenticated']) r
  cross join unnest(array['public.profiles','public.tickers','public.top_picks_universe']) t
  cross join unnest(array['INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN']) p),
  'neither browser role has tablewide reference mutation or bypass grants');
select ok((select bool_and(not has_column_privilege('anon','public.profiles',attname,p))
  from pg_attribute cross join unnest(array['INSERT','UPDATE']) p
  where attrelid='public.profiles'::regclass and attnum>0 and not attisdropped),
  'anonymous has no profile column INSERT or UPDATE');
select ok((select bool_and(has_column_privilege('authenticated','public.profiles',attname,'INSERT') =
  (attname = any(array['id','first_name','last_name','avatar_url','updated_at'])))
  from pg_attribute where attrelid='public.profiles'::regclass and attnum>0 and not attisdropped),
  'authenticated INSERT is exactly id and four editable profile fields');
select ok((select bool_and(has_column_privilege('authenticated','public.profiles',attname,'UPDATE') =
  (attname = any(array['first_name','last_name','avatar_url','updated_at'])))
  from pg_attribute where attrelid='public.profiles'::regclass and attnum>0 and not attisdropped),
  'authenticated UPDATE is exactly four editable profile fields');
select ok((select bool_and(not has_column_privilege(r,t,attname,p))
  from unnest(array['anon','authenticated']) r
  cross join unnest(array['public.tickers','public.top_picks_universe']) t
  join pg_attribute on attrelid=t::regclass
  cross join unnest(array['INSERT','UPDATE']) p where attnum>0 and not attisdropped),
  'both browser roles have no reference-ticker or universe column writes');
select ok((select bool_and(not has_sequence_privilege(r,'public.tickers_id_seq',p))
  from unnest(array['anon','authenticated']) r
  cross join unnest(array['USAGE','SELECT','UPDATE']) p),
  'existing ticker sequence denies all browser rights');
select ok((select bool_and(has_table_privilege('service_role',t,p))
  from unnest(array['public.profiles','public.tickers','public.top_picks_universe']) t
  cross join unnest(array['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN']) p),
  'service role retains all reference table rights including MAINTAIN');
select ok((select bool_and(has_sequence_privilege('service_role','public.tickers_id_seq',p))
  from unnest(array['USAGE','SELECT','UPDATE']) p), 'service role retains all ticker sequence rights');

-- Created by postgres: future objects test actual effective default privileges.
create table public.hardening_future_table (id integer);
create sequence public.hardening_future_sequence;
create function public.hardening_future_function() returns integer language sql as 'select 1';
select ok((select bool_and(not has_table_privilege(r,'public.hardening_future_table',p))
  from unnest(array['anon','authenticated']) r
  cross join unnest(array['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN']) p),
  'future postgres table grants no browser privileges');
select ok((select bool_and(not has_sequence_privilege(r,'public.hardening_future_sequence',p))
  from unnest(array['anon','authenticated']) r
  cross join unnest(array['USAGE','SELECT','UPDATE']) p), 'future postgres sequence grants no browser privileges');
select ok((select bool_and(not has_function_privilege(r,'public.hardening_future_function()','EXECUTE'))
  from unnest(array['anon','authenticated']) r), 'future postgres function grants no browser EXECUTE');
select ok(not exists(select from pg_class c cross join lateral aclexplode(coalesce(c.relacl,acldefault(case when c.relkind='S' then 's'::"char" else 'r'::"char" end,c.relowner))) a
  where c.oid in ('public.hardening_future_table'::regclass,'public.hardening_future_sequence'::regclass) and a.grantee=0)
  and not exists(select from pg_proc p cross join lateral aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
    where p.oid='public.hardening_future_function()'::regprocedure and a.grantee=0),
  'future table sequence and function have no PUBLIC ACL entry');
select ok((select bool_and(has_table_privilege('service_role','public.hardening_future_table',p))
  from unnest(array['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN']) p)
  and (select bool_and(has_sequence_privilege('service_role','public.hardening_future_sequence',p)) from unnest(array['USAGE','SELECT','UPDATE']) p)
  and has_function_privilege('service_role','public.hardening_future_function()','EXECUTE'),
  'future service-role defaults are preserved');

insert into auth.users(id,email) values
  ('61616161-6161-4161-8161-616161616161','hardening-owner@fit.test'),
  ('62626262-6262-4262-8262-626262626262','hardening-other@fit.test');
set local role authenticated;
set local request.jwt.claims='{"sub":"61616161-6161-4161-8161-616161616161","role":"authenticated"}';
select lives_ok($$insert into public.profiles(id,first_name,last_name,avatar_url,updated_at)
  values(auth.uid(),'Owner','Rehearsal','https://example.invalid/avatar',now())$$,
  'authenticated owner inserts id and four allowed fields');
select lives_ok($$update public.profiles set first_name='Changed',last_name='Checked',avatar_url=null,updated_at=now() where id=auth.uid()$$,
  'authenticated owner updates four allowed fields');
select is((select first_name from public.profiles where id=auth.uid()),'Changed','permitted profile UPDATE persists');
select throws_ok($$update public.profiles set id='62626262-6262-4262-8262-626262626262' where id=auth.uid()$$,'42501',null,
  'profile identity UPDATE is denied');
select throws_ok($$insert into public.profiles(id) values('62626262-6262-4262-8262-626262626262')$$,'42501',null,
  'profile ownership INSERT is denied');
select throws_ok($$delete from public.profiles where id=auth.uid()$$,'42501',null,'profile DELETE is denied');
select throws_ok($$truncate public.tickers$$,'42501',null,'native ticker TRUNCATE is denied');
select throws_ok($$select last_value from public.tickers_id_seq$$,'42501',null,'native ticker sequence read is denied');

-- Unexpected success deliberately raises ZX001, rolling the INSERT back inside
-- throws_ok's exception block without rewinding pgTAP's assertion counters.
select throws_ok($$do $attempt$ begin insert into storage.objects(bucket_id,name,owner) values('avatars','61616161-6161-4161-8161-616161616161/avatar','61616161-6161-4161-8161-616161616161'); raise exception using errcode='ZX001',message='unexpected successful avatar INSERT'; end $attempt$;$$,
  '42501',null,'avatar INSERT without owner_id is denied');
select throws_ok($$do $attempt$ begin insert into storage.objects(bucket_id,name,owner_id) values('avatars','61616161-6161-4161-8161-616161616161/avatar',null); raise exception using errcode='ZX001',message='unexpected successful avatar INSERT'; end $attempt$;$$,
  '42501',null,'avatar INSERT with null owner_id is denied');
select throws_ok($$do $attempt$ begin insert into storage.objects(bucket_id,name,owner,owner_id) values('avatars','61616161-6161-4161-8161-616161616161/avatar','62626262-6262-4262-8262-626262626262','62626262-6262-4262-8262-626262626262'); raise exception using errcode='ZX001',message='unexpected successful avatar INSERT'; end $attempt$;$$,
  '42501',null,'avatar INSERT with another owner_id is denied');
select throws_ok($$insert into storage.objects(bucket_id,name,owner_id) values('avatars','62626262-6262-4262-8262-626262626262/avatar','61616161-6161-4161-8161-616161616161')$$,
  '42501',null,'avatar INSERT into foreign canonical path is denied');
select throws_ok($$insert into storage.objects(bucket_id,name,owner_id) values('avatars','61616161-6161-4161-8161-616161616161/extra','61616161-6161-4161-8161-616161616161')$$,
  '42501',null,'avatar INSERT into noncanonical own path is denied');
set local request.jwt.claims='{"role":"authenticated"}';
select throws_ok($$insert into storage.objects(bucket_id,name,owner_id) values('avatars','61616161-6161-4161-8161-616161616161/avatar','61616161-6161-4161-8161-616161616161')$$,
  '42501',null,'avatar INSERT without JWT subject is denied');
set local request.jwt.claims='{"sub":"61616161-6161-4161-8161-616161616161","role":"authenticated"}';
select lives_ok($$insert into storage.objects(bucket_id,name,owner,owner_id) values('avatars','61616161-6161-4161-8161-616161616161/avatar','61616161-6161-4161-8161-616161616161','61616161-6161-4161-8161-616161616161')$$,
  'avatar INSERT with owner_id and own canonical path succeeds');

set local role anon;
set local request.jwt.claims='{}';
select is((select count(*) from public.profiles where id='61616161-6161-4161-8161-616161616161'),1::bigint,
  'anonymous SELECT reads the permitted public profile');
select throws_ok($$insert into public.profiles(id) values('62626262-6262-4262-8262-626262626262')$$,'42501',null,'anonymous profile INSERT is denied');
select throws_ok($$update public.profiles set first_name='Attack'$$,'42501',null,'anonymous profile UPDATE is denied');
reset role;
select * from finish();
rollback;
