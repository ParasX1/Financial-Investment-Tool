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

-- Exercise the reviewed recovery and forward bodies inside this same rollback
-- transaction. Compare sorted exploded ACL tuples, since GRANT changes raw ACL
-- array order without changing its effective permission identity.
create function pg_temp.reference_contract_snapshot() returns jsonb language sql as $snapshot$
  with relations as (
    select n.nspname||'.'||c.relname as name,c.relkind,c.relowner,c.relrowsecurity,c.relforcerowsecurity,
      coalesce((select jsonb_agg(jsonb_build_array(a.grantor,a.grantee,a.privilege_type,a.is_grantable)
        order by a.grantor,a.grantee,a.privilege_type,a.is_grantable)
        from aclexplode(coalesce(c.relacl,acldefault(case when c.relkind='S' then 's'::"char" else 'r'::"char" end,c.relowner))) a),'[]'::jsonb) as acl,
      (select jsonb_agg(jsonb_build_object('column',att.attname,'type',format_type(att.atttypid,att.atttypmod),
        'acl',coalesce((select jsonb_agg(jsonb_build_array(a.grantor,a.grantee,a.privilege_type,a.is_grantable)
          order by a.grantor,a.grantee,a.privilege_type,a.is_grantable) from aclexplode(att.attacl) a),'[]'::jsonb)) order by att.attnum)
        from pg_attribute att where att.attrelid=c.oid and att.attnum>0 and not att.attisdropped) as columns
    from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname in ('public','private','storage') and c.relkind in ('r','p','S','v','m')
  ), functions as (
    select n.nspname as schema,p.oid::regprocedure::text as signature,p.proowner,p.prosecdef,p.proconfig,
      p.proargnames,p.pronargdefaults,pg_get_functiondef(p.oid) as definition,obj_description(p.oid,'pg_proc') as comment,
      coalesce((select jsonb_agg(jsonb_build_array(a.grantor,a.grantee,a.privilege_type,a.is_grantable)
        order by a.grantor,a.grantee,a.privilege_type,a.is_grantable)
        from aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a),'[]'::jsonb) as acl
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname in ('public','private') and p.prokind in ('f','p')
  ), defaults as (
    select pg_get_userbyid(d.defaclrole) as creator,coalesce(n.nspname,'GLOBAL') as schema,d.defaclobjtype,
      coalesce((select jsonb_agg(jsonb_build_array(a.grantor,a.grantee,a.privilege_type,a.is_grantable)
        order by a.grantor,a.grantee,a.privilege_type,a.is_grantable) from aclexplode(d.defaclacl) a),'[]'::jsonb) as acl
    from pg_default_acl d left join pg_namespace n on n.oid=d.defaclnamespace
  ), service_relation_acl as (
    select r.name,'TABLE' as scope,a.value as acl from relations r
      cross join lateral jsonb_array_elements(r.acl) a
      where a.value->>1=(select oid::text from pg_roles where rolname='service_role')
    union all
    select r.name,col.value->>'column',a.value from relations r
      cross join lateral jsonb_array_elements(r.columns) col
      cross join lateral jsonb_array_elements(col.value->'acl') a
      where a.value->>1=(select oid::text from pg_roles where rolname='service_role')
  ), service_default_acl as (
    select d.creator,d.schema,d.defaclobjtype,a.value as acl from defaults d
      cross join lateral jsonb_array_elements(d.acl) a
      where a.value->>1=(select oid::text from pg_roles where rolname='service_role')
  ), policies as (
    select schemaname,tablename,policyname,permissive,cmd,roles,qual,with_check
    from pg_policies where schemaname in ('public','private','storage')
  ), protected as (
    select jsonb_build_object(
      'untargetedRelations',(select jsonb_agg(to_jsonb(r) order by name) from relations r
        where name not in ('public.profiles','public.tickers','public.top_picks_universe','public.tickers_id_seq')),
      'functionsHash',(select md5(jsonb_agg(to_jsonb(f) order by schema,signature)::text) from functions f),
      'serviceRelationACL',(select jsonb_agg(to_jsonb(s) order by name,scope,acl::text) from service_relation_acl s),
      'serviceDefaultACL',(select jsonb_agg(to_jsonb(s) order by creator,schema,defaclobjtype,acl::text) from service_default_acl s),
      'otherDefaults',(select jsonb_agg(to_jsonb(d) order by creator,schema,defaclobjtype) from defaults d
        where not (creator='postgres' and ((schema='public' and defaclobjtype in ('r','S','f')) or (schema='GLOBAL' and defaclobjtype='f')))),
      'untargetedPolicies',(select jsonb_agg(to_jsonb(p) order by schemaname,tablename,policyname) from policies p
        where not (schemaname='storage' and tablename='objects' and policyname='Users can upload their own avatar images.')),
      'dataHash',md5(jsonb_build_object(
        'profiles',(select jsonb_agg(to_jsonb(r) order by id) from public.profiles r),
        'tickers',(select jsonb_agg(to_jsonb(r) order by id) from public.tickers r),
        'universe',(select jsonb_agg(to_jsonb(r) order by symbol) from public.top_picks_universe r),
        'Users',(select jsonb_agg(to_jsonb(r) order by id) from public."Users" r),
        'authUsers',(select jsonb_agg(to_jsonb(r) order by id) from auth.users r),
        'objects',(select jsonb_agg(to_jsonb(r) order by id) from storage.objects r),
        'posts',(select jsonb_agg(to_jsonb(r) order by id) from public.posts r),
        'comments',(select jsonb_agg(to_jsonb(r) order by id) from public.comments r),
        'tickets',(select jsonb_agg(to_jsonb(r) order by id) from private.community_image_cleanup r),
        'tickerSequence',(select jsonb_build_array(last_value,is_called) from public.tickers_id_seq),
        'ledger',(select jsonb_agg(to_jsonb(r) order by version) from supabase_migrations.schema_migrations r)
      )::text)
    ) as state
  )
  select jsonb_build_object(
    'targets',(select jsonb_agg(to_jsonb(r) order by name) from relations r
      where name in ('public.profiles','public.tickers','public.top_picks_universe','public.tickers_id_seq')),
    'defaults',(select jsonb_agg(to_jsonb(d) order by creator,schema,defaclobjtype) from defaults d),
    'avatarInsert',(select to_jsonb(p) from policies p where schemaname='storage' and tablename='objects'
      and policyname='Users can upload their own avatar images.'),
    'protected',(select state from protected)
  );
$snapshot$;
create temporary table reference_contract_before as select pg_temp.reference_contract_snapshot() as state;

-- Exact inverse.sql body; its BEGIN/COMMIT wrappers are deliberately omitted.
set local lock_timeout = '3s';
set local statement_timeout = '30s';
alter policy "Users can upload their own avatar images." on storage.objects
  to authenticated with check (
    bucket_id = 'avatars' and name = (select auth.uid())::text || '/avatar'
  );
revoke insert (id, first_name, last_name, avatar_url, updated_at),
  update (first_name, last_name, avatar_url, updated_at)
  on table public.profiles from authenticated;
grant all on table public.profiles, public.tickers, public.top_picks_universe to anon, authenticated;
grant all on sequence public.tickers_id_seq to anon, authenticated;
alter default privileges for role postgres in schema public grant all on tables to anon, authenticated;
alter default privileges for role postgres in schema public grant all on sequences to anon, authenticated;
alter default privileges for role postgres in schema public grant all on functions to anon, authenticated;
alter default privileges for role postgres grant execute on functions to public;
notify pgrst, 'reload schema';

select ok((select bool_and(has_table_privilege(r,t,p))
  from unnest(array['anon','authenticated']) r
  cross join unnest(array['public.profiles','public.tickers','public.top_picks_universe']) t
  cross join unnest(array['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN']) p)
  and (select bool_and(has_sequence_privilege(r,'public.tickers_id_seq',p))
    from unnest(array['anon','authenticated']) r cross join unnest(array['USAGE','SELECT','UPDATE']) p)
  and not exists(select from pg_attribute where attrelid='public.profiles'::regclass and attnum>0
    and not attisdropped and attacl is not null)
  and (select cmd='INSERT' and roles=array['authenticated']::name[] and with_check not like '%owner_id%'
    and with_check like '%auth.uid%' and with_check like '%/avatar%'
    from pg_policies where schemaname='storage' and tablename='objects'
      and policyname='Users can upload their own avatar images.'),
  'inverse body restores broad browser grants, empty profile column ACLs and path-only avatar INSERT');
select is(pg_temp.reference_contract_snapshot()->'protected',
  (select state->'protected' from reference_contract_before),
  'inverse body preserves Users, existing functions, service grants, other defaults, policies and fixture data');

-- Exact 20261010081946 forward body, also without transaction wrappers.
set local lock_timeout = '3s';
set local statement_timeout = '30s';
alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all on functions from anon, authenticated;
alter default privileges for role postgres revoke execute on functions from public;
revoke all on table public.profiles, public.tickers, public.top_picks_universe
  from public, anon, authenticated;
revoke all on sequence public.tickers_id_seq from public, anon, authenticated;
grant select on table public.profiles, public.tickers, public.top_picks_universe
  to anon, authenticated;
grant insert (id, first_name, last_name, avatar_url, updated_at),
  update (first_name, last_name, avatar_url, updated_at)
  on table public.profiles to authenticated;
alter policy "Users can upload their own avatar images." on storage.objects
  to authenticated
  with check (
    bucket_id = 'avatars'
    and owner_id = (select auth.uid())::text
    and name = (select auth.uid())::text || '/avatar'
  );
notify pgrst, 'reload schema';
select is(pg_temp.reference_contract_snapshot(),(select state from reference_contract_before),
  'forward body restores the complete canonical grant, default, avatar and protected data snapshot');

select * from finish();
rollback;
