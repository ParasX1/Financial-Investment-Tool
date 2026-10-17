-- Protected synchronous transport: no credentials enter pg_net's readable queue.
-- Provisioning is separate from scheduling; replay sends no HTTP requests.
begin;
set local lock_timeout = '3s';
set local statement_timeout = '30s';
create extension if not exists http with schema extensions;
create extension if not exists pg_cron;
revoke all on table vault.secrets, vault.decrypted_secrets
  from public, anon, authenticated;

do $provision$
declare crypto_schema text;
begin
  if not exists (select 1 from vault.secrets where name = 'fit_community_cleanup_caller') then
    select n.nspname into strict crypto_schema
      from pg_extension e join pg_namespace n on n.oid = e.extnamespace
      where e.extname = 'pgcrypto';
    execute format(
      'select vault.create_secret(encode(%I.gen_random_bytes(32), ''hex''), ''fit_community_cleanup_caller'')',
      crypto_schema
    );
  end if;
end;
$provision$;

create function public.community_image_cleanup_authorized(p_token text)
returns boolean language sql stable security definer set search_path = ''
as $auth$
  select coalesce(
    length(p_token) = 64
    and pg_catalog.sha256(pg_catalog.convert_to(p_token, 'UTF8')) = (
      select pg_catalog.sha256(pg_catalog.convert_to(s.decrypted_secret, 'UTF8'))
      from vault.decrypted_secrets s where s.name = 'fit_community_cleanup_caller'
    ), false
  );
$auth$;
revoke all on function public.community_image_cleanup_authorized(text)
  from public, anon, authenticated;
grant execute on function public.community_image_cleanup_authorized(text) to service_role;

-- Only an administrator/cron job selects the URL; no caller-supplied cleanup path.
create function private.invoke_community_image_cleanup(p_url text)
returns jsonb language plpgsql security definer
set search_path = ''
set client_min_messages = 'warning'
set http.timeout_msec = '70000'
as $invoke$
declare caller_token text; response extensions.http_response; summary jsonb; field text; value numeric;
begin
  -- http's DEBUG2 header tracing must never record the caller credential.
  if current_setting('log_min_messages') in ('debug2','debug3','debug4','debug5') then
    raise exception 'Secret-safe HTTP logging is required.';
  end if;
  if p_url !~ '^https://[a-z0-9-]+\.supabase\.co/functions/v1/community-image-cleanup$' then
    raise exception 'Use the verified Supabase cleanup endpoint.';
  end if;
  select s.decrypted_secret into strict caller_token
    from vault.decrypted_secrets s where s.name = 'fit_community_cleanup_caller';
  begin
    select * into response from extensions.http((
      'POST', p_url,
      array[extensions.http_header('Authorization','Bearer ' || caller_token)],
      'application/json','{}'
    )::extensions.http_request);
  exception when others then
    raise exception 'Cleanup HTTP request failed.';
  end;
  if response.status <> 200 then
    raise exception 'Cleanup worker failed (HTTP %).', response.status;
  end if;
  begin
    summary := response.content::jsonb;
  exception when others then
    raise exception 'Cleanup worker response is invalid.';
  end;
  foreach field in array array['listed','attempted','completed','skipped','failed','diagnostic_failures'] loop
    if jsonb_typeof(summary->field) is distinct from 'number' then
      raise exception 'Cleanup worker counts are invalid.';
    end if;
    value := (summary->>field)::numeric;
    if value < 0 or value > 10 or value <> trunc(value) then
      raise exception 'Cleanup worker counts are invalid.';
    end if;
  end loop;
  if summary->>'failed' is distinct from '0' then
    raise exception 'Cleanup worker reported incomplete work.';
  end if;
  return jsonb_build_object('http_status',response.status,'summary',
    jsonb_build_object('listed',summary->'listed','attempted',summary->'attempted',
      'completed',summary->'completed','skipped',summary->'skipped',
      'failed',summary->'failed','diagnostic_failures',summary->'diagnostic_failures'));
end;
$invoke$;
revoke all on function private.invoke_community_image_cleanup(text)
  from public, anon, authenticated, service_role;
comment on function private.invoke_community_image_cleanup(text) is
  'Administrator-only synchronous HTTP call; Vault token is never persisted in a transport queue or returned.';
notify pgrst, 'reload schema';
commit;
