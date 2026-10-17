begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select no_plan();

-- All fixtures are local, synthetic, and rolled back, including auth rows.
insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-4111-8111-111111111111', 'owner@fit.test', '{"first_name":"Owner"}'),
  ('22222222-2222-4222-8222-222222222222', 'other@fit.test', '{"first_name":"Other"}');

select is((select email from public."Users" where id = '11111111-1111-4111-8111-111111111111'),
  'owner@fit.test', 'auth trigger creates a profile using the auth-owned email');
select ok((select bool_and(relrowsecurity) from pg_class where oid in (
  'public."Users"'::regclass, 'public.user_watchlist'::regclass,
  'public.top_picks_prefs'::regclass, 'public.portfolio_prefs'::regclass)),
  'all private tables enable RLS');

set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}';
select is((select count(*) from public."Users"), 1::bigint, 'owner sees only their private profile');
select lives_ok($$update public."Users" set first_name = 'Updated' where id = auth.uid()$$,
  'owner can edit permitted profile fields');
select is((select first_name from public."Users"), 'Updated', 'owner profile update persists');
select throws_ok($$update public."Users" set email = 'forged@fit.test' where id = auth.uid()$$,
  '42501', null, 'auth-owned email cannot be changed by a browser role');
select throws_ok($$update public."Users" set id = '22222222-2222-4222-8222-222222222222' where id = auth.uid()$$,
  '42501', null, 'private profile ownership cannot be reassigned');
select throws_ok($$insert into public."Users" (id) values (auth.uid())$$,
  '42501', null, 'browser cannot create private profiles outside the auth trigger');

select lives_ok($$insert into public.user_watchlist (user_id, symbol, position) values
  (auth.uid(), 'BHP.AX', 0), (auth.uid(), 'CBA.AX', 1)$$, 'owner can create watchlist items');
select throws_ok($$insert into public.user_watchlist (user_id, symbol, position) values
  ('22222222-2222-4222-8222-222222222222', 'NAB.AX', 0)$$,
  '42501', null, 'watchlist cannot be inserted for another owner');
select lives_ok($$update public.user_watchlist set note = 'Research' where symbol = 'BHP.AX'$$,
  'owner can update a watchlist item');
select throws_ok($$update public.user_watchlist set user_id = '22222222-2222-4222-8222-222222222222'$$,
  '42501', null, 'watchlist ownership cannot be reassigned');
select throws_ok($$update public.user_watchlist set note = repeat('x', 281) where symbol = 'BHP.AX'$$,
  '23514', null, 'watchlist note limit is enforced by the database');
select lives_ok($$select public.reorder_watchlist(array['CBA.AX','BHP.AX'])$$,
  'owner can atomically reorder the watchlist');
select is((select position from public.user_watchlist where symbol = 'CBA.AX'), 0,
  'reorder assigns the requested first position');
select throws_ok($$select public.reorder_watchlist(array['CBA.AX','CBA.AX'])$$,
  '22023', null, 'reorder rejects duplicates');
select throws_ok($$select public.reorder_watchlist(array['CBA.AX'])$$,
  '22023', null, 'reorder requires every saved symbol');

select lives_ok($$insert into public.top_picks_prefs (user_id) values (auth.uid())$$,
  'owner can create Top Picks preferences');
select lives_ok($$update public.top_picks_prefs set page_size = 50 where user_id = auth.uid()$$,
  'owner can update Top Picks preferences');
select throws_ok($$insert into public.top_picks_prefs (user_id) values ('22222222-2222-4222-8222-222222222222')$$,
  '42501', null, 'Top Picks preferences cannot be inserted for another owner');
select throws_ok($$update public.top_picks_prefs set user_id = '22222222-2222-4222-8222-222222222222'$$,
  '42501', null, 'Top Picks preference ownership cannot be reassigned');
select throws_ok($$update public.top_picks_prefs set page_size = 500$$,
  '23514', null, 'Top Picks page-size contract is enforced');

select lives_ok($$insert into public.portfolio_prefs (user_id, tags) values (auth.uid(), array['income'])$$,
  'owner can create Portfolio preferences');
select lives_ok($$update public.portfolio_prefs set tags = array['growth'] where user_id = auth.uid()$$,
  'owner can update Portfolio preferences');
select throws_ok($$insert into public.portfolio_prefs (user_id) values ('22222222-2222-4222-8222-222222222222')$$,
  '42501', null, 'Portfolio preferences cannot be inserted for another owner');
select throws_ok($$update public.portfolio_prefs set user_id = '22222222-2222-4222-8222-222222222222'$$,
  '42501', null, 'Portfolio preference ownership cannot be reassigned');

set local request.jwt.claims = '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}';
select is((select count(*) from public."Users" where id = '11111111-1111-4111-8111-111111111111'),
  0::bigint, 'other user cannot read owner private profile');
select results_eq($$with changed as (update public."Users" set first_name = 'Attack' where id = '11111111-1111-4111-8111-111111111111' returning id)
  select count(*) from changed$$, array[0::bigint], 'other user cannot update owner private profile');
select is((select count(*) from public.user_watchlist), 0::bigint, 'other user cannot read owner watchlist');
select results_eq($$with changed as (update public.user_watchlist set note = 'Attack' returning user_id) select count(*) from changed$$, array[0::bigint], 'other user cannot update owner watchlist');
select results_eq($$with removed as (delete from public.user_watchlist returning user_id) select count(*) from removed$$, array[0::bigint], 'other user cannot delete owner watchlist');
select is((select count(*) from public.top_picks_prefs), 0::bigint, 'other user cannot read owner Top Picks preferences');
select results_eq($$with changed as (update public.top_picks_prefs set page_size = 10 returning user_id) select count(*) from changed$$, array[0::bigint], 'other user cannot update owner Top Picks preferences');
select is((select count(*) from public.portfolio_prefs), 0::bigint, 'other user cannot read owner Portfolio preferences');
select results_eq($$with changed as (update public.portfolio_prefs set tags = '{}' returning user_id) select count(*) from changed$$, array[0::bigint], 'other user cannot update owner Portfolio preferences');

set local request.jwt.claims = '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}';
select lives_ok($$select public.remove_watchlist_item('CBA.AX')$$, 'owner can remove a watchlist item through RPC');
select is((select position from public.user_watchlist where symbol = 'BHP.AX'), 0,
  'removal compacts remaining positions');

set local request.jwt.claims = '{}';
select is((select count(*) from public."Users"), 0::bigint, 'missing subject reveals no private profile');
select throws_ok($$select public.reorder_watchlist('{}')$$, '42501', 'Authentication is required.',
  'watchlist RPC rejects an authenticated role without a subject');

set local role anon;
select throws_ok($$select * from public."Users"$$, '42501', null, 'anonymous cannot read private profiles');
select throws_ok($$select * from public.user_watchlist$$, '42501', null, 'anonymous cannot read watchlists');
select throws_ok($$select * from public.top_picks_prefs$$, '42501', null, 'anonymous cannot read Top Picks preferences');
select throws_ok($$select * from public.portfolio_prefs$$, '42501', null, 'anonymous cannot read Portfolio preferences');
select throws_ok($$select public.remove_watchlist_item('BHP.AX')$$, '42501', null,
  'anonymous cannot execute the watchlist mutation RPC');

reset role;
select ok(not has_function_privilege('anon', 'public.handle_new_user()', 'EXECUTE'),
  'anonymous cannot execute the auth trigger function');
select ok(not has_function_privilege('authenticated', 'public.handle_new_user()', 'EXECUTE'),
  'authenticated cannot execute the auth trigger function');
select ok((select bool_and(not has_table_privilege(browser_role, table_name, 'TRUNCATE'))
  from unnest(array['anon','authenticated']) as browser_role
  cross join unnest(array['public."Users"','public.user_watchlist','public.top_picks_prefs','public.portfolio_prefs']) as table_name),
  'private tables do not expose RLS-bypassing TRUNCATE');
select * from finish();
rollback;
