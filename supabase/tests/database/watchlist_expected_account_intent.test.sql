-- Synthetic owners and all mutations roll back after the authorization checks.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select no_plan();

create temporary table watchlist_legacy_contract as
select oid, pg_get_functiondef(oid) as definition, proacl
from pg_proc
where oid in (
  'public.remove_watchlist_item(text)'::regprocedure,
  'public.reorder_watchlist(text[])'::regprocedure
);

select is((select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'remove_watchlist_item'), 2::bigint,
  'remove retains legacy and required-owner signatures');
select is((select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'reorder_watchlist'), 2::bigint,
  'reorder retains legacy and required-owner signatures');
select ok((select bool_and(not prosecdef and prorettype = 'void'::regtype
    and pronargdefaults = 0 and proconfig @> array['search_path=""'])
  from pg_proc where oid in (
    'public.remove_watchlist_item(text)'::regprocedure,
    'public.reorder_watchlist(text[])'::regprocedure,
    'public.remove_watchlist_item(text,uuid)'::regprocedure,
    'public.reorder_watchlist(text[],uuid)'::regprocedure)),
  'all signatures return void, use invoker rights and empty search paths without defaults');
select is((select proargnames from pg_proc
  where oid = 'public.remove_watchlist_item(text,uuid)'::regprocedure),
  array['item_symbol','p_expected_user_id'], 'remove exposes the expected-owner named argument');
select is((select proargnames from pg_proc
  where oid = 'public.reorder_watchlist(text[],uuid)'::regprocedure),
  array['ordered_symbols','p_expected_user_id'], 'reorder exposes the expected-owner named argument');
select ok((select bool_and(has_function_privilege(role_name, signature, 'EXECUTE'))
  from unnest(array['authenticated','service_role']) role_name
  cross join unnest(array[
    'public.remove_watchlist_item(text)', 'public.reorder_watchlist(text[])',
    'public.remove_watchlist_item(text,uuid)', 'public.reorder_watchlist(text[],uuid)'
  ]) signature), 'both allowed roles can execute wrappers and their legacy delegates');
select ok((select bool_and(not has_function_privilege('anon', signature, 'EXECUTE'))
  from unnest(array[
    'public.remove_watchlist_item(text)', 'public.reorder_watchlist(text[])',
    'public.remove_watchlist_item(text,uuid)', 'public.reorder_watchlist(text[],uuid)'
  ]) signature), 'anonymous cannot execute either signature');
select ok(not exists (select 1 from pg_proc p
  cross join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) acl
  where p.oid in (
    'public.remove_watchlist_item(text)'::regprocedure,
    'public.reorder_watchlist(text[])'::regprocedure,
    'public.remove_watchlist_item(text,uuid)'::regprocedure,
    'public.reorder_watchlist(text[],uuid)'::regprocedure
  ) and acl.grantee = 0), 'PUBLIC has no execution grant on either signature');

insert into auth.users (id, email) values
  ('41414141-4141-4141-8141-414141414141', 'watchlist-intent-a@fit.test'),
  ('42424242-4242-4242-8242-424242424242', 'watchlist-intent-b@fit.test');
insert into public.user_watchlist (user_id, symbol, position, note, target_price) values
  ('41414141-4141-4141-8141-414141414141', 'CBA.AX', 0, 'A note', 125),
  ('41414141-4141-4141-8141-414141414141', 'BHP.AX', 1, null, null),
  ('41414141-4141-4141-8141-414141414141', 'CSL.AX', 2, null, null),
  ('42424242-4242-4242-8242-424242424242', 'CBA.AX', 0, 'B note', 130),
  ('42424242-4242-4242-8242-424242424242', 'BHP.AX', 1, null, null),
  ('42424242-4242-4242-8242-424242424242', 'CSL.AX', 2, null, null);
create temporary table watchlist_b_before as
select * from public.user_watchlist where user_id = '42424242-4242-4242-8242-424242424242';
grant select on watchlist_b_before to authenticated;

set local role anon;
set local request.jwt.claims = '{}';
select throws_ok($$select public.remove_watchlist_item('CBA.AX', '41414141-4141-4141-8141-414141414141')$$,
  '42501', null, 'anon cannot execute expected-owner removal');
select throws_ok($$select public.reorder_watchlist('{CSL.AX,BHP.AX,CBA.AX}', '41414141-4141-4141-8141-414141414141')$$,
  '42501', null, 'anon cannot execute expected-owner reorder');

set local role authenticated;
set local request.jwt.claims = '{}';
select throws_ok($$select public.remove_watchlist_item('CBA.AX', '41414141-4141-4141-8141-414141414141')$$,
  '42501', 'Your session changed. Please try again.', 'missing JWT subject cannot remove');
select throws_ok($$select public.reorder_watchlist('{CSL.AX,BHP.AX,CBA.AX}', '41414141-4141-4141-8141-414141414141')$$,
  '42501', 'Your session changed. Please try again.', 'missing JWT subject cannot reorder');
select throws_ok($$select public.remove_watchlist_item('CBA.AX', null)$$,
  '42501', 'Your session changed. Please try again.', 'null subject and null expected owner cannot remove');
select throws_ok($$select public.reorder_watchlist('{CSL.AX,BHP.AX,CBA.AX}', null)$$,
  '42501', 'Your session changed. Please try again.', 'null subject and null expected owner cannot reorder');

set local request.jwt.claims = '{"sub":"41414141-4141-4141-8141-414141414141","role":"authenticated"}';
select lives_ok($$select public.reorder_watchlist('{ csl.ax ,bhp.ax,cba.ax}', '41414141-4141-4141-8141-414141414141')$$,
  'matching expected owner reorders atomically with legacy normalization');
select results_eq($$select symbol, position from public.user_watchlist order by position$$,
  $$values ('CSL.AX'::text, 0), ('BHP.AX'::text, 1), ('CBA.AX'::text, 2)$$,
  'matching reorder saves every position for A');
select lives_ok($$select public.remove_watchlist_item(' bhp.ax ', '41414141-4141-4141-8141-414141414141')$$,
  'matching expected owner removes and compacts atomically');
select results_eq($$select symbol, position from public.user_watchlist order by position$$,
  $$values ('CSL.AX'::text, 0), ('CBA.AX'::text, 1)$$, 'removal compacts A positions');
select is((select note from public.user_watchlist where symbol = 'CBA.AX'), 'A note',
  'atomic changes preserve the remaining research note');
select is((select target_price from public.user_watchlist where symbol = 'CBA.AX'), 125::numeric,
  'atomic changes preserve the remaining target price');

-- The token changes to B while the initiating account remains A.
set local request.jwt.claims = '{"sub":"42424242-4242-4242-8242-424242424242","role":"authenticated"}';
select throws_ok($$select public.remove_watchlist_item('CBA.AX', '41414141-4141-4141-8141-414141414141')$$,
  '42501', 'Your session changed. Please try again.', 'B token cannot perform A removal');
select throws_ok($$select public.reorder_watchlist('{CSL.AX,BHP.AX,CBA.AX}', '41414141-4141-4141-8141-414141414141')$$,
  '42501', 'Your session changed. Please try again.', 'B token cannot perform A reorder');
select throws_ok($$select public.remove_watchlist_item('CBA.AX', null)$$,
  '42501', 'Your session changed. Please try again.', 'null expected owner cannot remove B item');
select throws_ok($$select public.reorder_watchlist('{CSL.AX,BHP.AX,CBA.AX}', null)$$,
  '42501', 'Your session changed. Please try again.', 'null expected owner cannot reorder B list');
select throws_ok($$select public.remove_watchlist_item(null, '41414141-4141-4141-8141-414141414141')$$,
  '42501', 'Your session changed. Please try again.', 'mismatch is rejected before legacy symbol validation');
select throws_ok($$select public.reorder_watchlist(null, '41414141-4141-4141-8141-414141414141')$$,
  '42501', 'Your session changed. Please try again.', 'mismatch is rejected before legacy order validation');
select results_eq($$select * from public.user_watchlist order by position$$,
  $$select * from watchlist_b_before order by position$$,
  'denied requests leave every B row and timestamp unchanged');

-- Same owner with refreshed claims retains the intended account.
set local request.jwt.claims = '{"sub":"42424242-4242-4242-8242-424242424242","role":"authenticated","iat":2000000000}';
select lives_ok($$select public.reorder_watchlist('{BHP.AX,CSL.AX,CBA.AX}', '42424242-4242-4242-8242-424242424242')$$,
  'same-owner refresh can reorder');
select lives_ok($$select public.remove_watchlist_item('CSL.AX', '42424242-4242-4242-8242-424242424242')$$,
  'same-owner refresh can remove');
select results_eq($$select symbol, position from public.user_watchlist order by position$$,
  $$values ('BHP.AX'::text, 0), ('CBA.AX'::text, 1)$$, 'refreshed owner saves its intended list');

set local request.jwt.claims = '{"sub":"41414141-4141-4141-8141-414141414141","role":"authenticated"}';
select lives_ok($$select public.reorder_watchlist('{CBA.AX,CSL.AX}')$$,
  'existing one-argument reorder remains compatible');
select lives_ok($$select public.remove_watchlist_item('CBA.AX')$$,
  'existing one-argument removal remains compatible');
select results_eq($$select symbol, position from public.user_watchlist order by position$$,
  $$values ('CSL.AX'::text, 0)$$, 'legacy removal still compacts the saved list');

set local role service_role;
set local request.jwt.claims = '{"sub":"42424242-4242-4242-8242-424242424242","role":"service_role"}';
select throws_ok($$select public.remove_watchlist_item('CBA.AX', '41414141-4141-4141-8141-414141414141')$$,
  '42501', 'Your session changed. Please try again.', 'service role cannot bypass the removal intent guard');
select throws_ok($$select public.reorder_watchlist('{CBA.AX,BHP.AX}', '41414141-4141-4141-8141-414141414141')$$,
  '42501', 'Your session changed. Please try again.', 'service role cannot bypass the reorder intent guard');
select lives_ok($$select public.reorder_watchlist('{CBA.AX,BHP.AX}', '42424242-4242-4242-8242-424242424242')$$,
  'service role can execute a matching intent through the existing delegate');
select lives_ok($$select public.remove_watchlist_item('CBA.AX', '42424242-4242-4242-8242-424242424242')$$,
  'service role can remove through the existing delegate');

reset role;
select results_eq($$select oid, pg_get_functiondef(oid), proacl from pg_proc
  where oid in ('public.remove_watchlist_item(text)'::regprocedure,
    'public.reorder_watchlist(text[])'::regprocedure) order by oid$$,
  $$select oid, definition, proacl from watchlist_legacy_contract order by oid$$,
  'wrapper calls leave legacy definitions and ACLs unchanged');
select * from finish();
rollback;
