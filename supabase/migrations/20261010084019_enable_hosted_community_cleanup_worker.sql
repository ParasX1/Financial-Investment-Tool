-- Provider-backed cleanup without exporting the service key or caller token.
-- Provisioning is separate from scheduling: source replay sends no HTTP requests.
begin;
set local lock_timeout = '3s';
set local statement_timeout = '30s';
create extension if not exists pg_net;
create extension if not exists pg_cron;

-- These transport and secret surfaces are for the protected worker only.
revoke all on table vault.secrets, vault.decrypted_secrets
  from public, anon, authenticated;
revoke all on table net.http_request_queue, net._http_response
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

-- Only an administrator/cron job can choose the deployment URL or queue a call.
create function private.invoke_community_image_cleanup(p_url text)
returns bigint language plpgsql security definer set search_path = ''
as $invoke$
declare caller_token text;
begin
  select s.decrypted_secret into strict caller_token
    from vault.decrypted_secrets s where s.name = 'fit_community_cleanup_caller';
  return net.http_post(
    url := p_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json', 'x-fit-cleanup-token', caller_token
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 70000
  );
end;
$invoke$;
revoke all on function private.invoke_community_image_cleanup(text)
  from public, anon, authenticated, service_role;
comment on function private.invoke_community_image_cleanup(text) is
  'Administrator-only dispatcher; URL is selected in the reviewed cron operation, token stays inside Vault/transport.';
notify pgrst, 'reload schema';
commit;
