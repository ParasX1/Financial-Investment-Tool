-- Fresh local replay contract; no token values or outbound HTTP are requested.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(12);
select ok((select count(*)=2 from pg_extension where extname in ('pg_net','pg_cron')), 'worker transport extensions are installed');
select is((select count(*) from vault.secrets where name='fit_community_cleanup_caller'),1::bigint,'one protected caller credential is provisioned');
select ok((select bool_and(not has_table_privilege(r,t,'SELECT')) from unnest(array['anon','authenticated']) r cross join unnest(array['vault.secrets','vault.decrypted_secrets']) t), 'browser roles cannot read Vault credentials');
select ok((select bool_and(not has_table_privilege(r,t,'SELECT')) from unnest(array['anon','authenticated']) r cross join unnest(array['net.http_request_queue','net._http_response']) t), 'browser roles cannot read transport headers or responses');
select ok((select bool_and(not has_function_privilege(r,'public.community_image_cleanup_authorized(text)','EXECUTE')) from unnest(array['anon','authenticated']) r), 'browser roles cannot invoke the token validator');
select ok(has_function_privilege('service_role','public.community_image_cleanup_authorized(text)','EXECUTE'), 'service worker can invoke the token validator');
select ok((select bool_and(not has_function_privilege(r,'private.invoke_community_image_cleanup(text)','EXECUTE')) from unnest(array['anon','authenticated','service_role']) r), 'only the administrator can queue a worker request');
select ok(has_function_privilege('postgres','private.invoke_community_image_cleanup(text)','EXECUTE'), 'administrator retains dispatcher execution');
select is(public.community_image_cleanup_authorized(null),false,'missing caller credential fails closed');
select is(public.community_image_cleanup_authorized(repeat('0',64)),false,'incorrect caller credential fails closed');
select ok((select bool_and(proconfig @> array['search_path=""']) from pg_proc where oid in ('public.community_image_cleanup_authorized(text)'::regprocedure,'private.invoke_community_image_cleanup(text)'::regprocedure)), 'privileged worker helpers have fixed empty search paths');
select is((select count(*) from cron.job where jobname='fit-community-image-cleanup'),0::bigint,'source replay does not schedule requests to a deployed project');
select * from finish();
rollback;
