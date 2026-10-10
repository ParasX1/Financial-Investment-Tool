-- Keep the one-argument functions and their ACLs for existing callers. The
-- browser sends its initiating account as a required second argument so a
-- token selected after an account switch cannot mutate the new account's list.
create or replace function public.remove_watchlist_item(
  item_symbol text,
  p_expected_user_id uuid
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null
    or p_expected_user_id is distinct from current_user_id
  then
    raise exception using
      errcode = '42501',
      message = 'Your session changed. Please try again.';
  end if;

  perform public.remove_watchlist_item(item_symbol);
end;
$$;

create or replace function public.reorder_watchlist(
  ordered_symbols text[],
  p_expected_user_id uuid
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null
    or p_expected_user_id is distinct from current_user_id
  then
    raise exception using
      errcode = '42501',
      message = 'Your session changed. Please try again.';
  end if;

  perform public.reorder_watchlist(ordered_symbols);
end;
$$;

revoke all on function public.remove_watchlist_item(text, uuid)
from public, anon;
revoke all on function public.reorder_watchlist(text[], uuid)
from public, anon;
grant execute on function public.remove_watchlist_item(text, uuid)
to authenticated, service_role;
grant execute on function public.reorder_watchlist(text[], uuid)
to authenticated, service_role;

notify pgrst, 'reload schema';
