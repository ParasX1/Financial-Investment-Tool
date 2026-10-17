begin;

-- #288 is a prerequisite: these restrictive policies add path retirement to
-- its canonical owner_id policies, without granting any additional ownership.
create schema if not exists private;
create table private.community_image_cleanup (
  id bigint generated always as identity primary key,
  object_id uuid,
  bucket_id text not null default 'comment-images'
    check (bucket_id = 'comment-images'),
  object_name text not null,
  owner_id text not null,
  requested_at timestamptz not null default clock_timestamp(),
  completed_at timestamptz,
  last_attempt_at timestamptz,
  error_code text check (error_code in (
    'storage_remove_failed', 'dispatch_failed', 'ack_failed',
    'object_restored', 'owner_mismatch', 'referenced', 'invalid_dispatch'
  )),
  unique (bucket_id, object_name)
);
alter table private.community_image_cleanup enable row level security;
revoke all on private.community_image_cleanup from public, anon, authenticated, service_role;
revoke all on sequence private.community_image_cleanup_id_seq from public, anon, authenticated, service_role;
create index community_image_cleanup_pending_attempt
  on private.community_image_cleanup (last_attempt_at nulls first, requested_at, id)
  where completed_at is null;
create index posts_image_cleanup_reference on public.posts (image_path) where image_path is not null;
create index comments_image_cleanup_reference on public.comments (image_path) where image_path is not null;

create function private.community_image_path_reserved(p_name text)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from private.community_image_cleanup
    where bucket_id = 'comment-images' and object_name = p_name);
$$;
revoke all on function private.community_image_path_reserved(text) from public, anon, authenticated;
grant usage on schema private to authenticated;
grant execute on function private.community_image_path_reserved(text) to authenticated;

create policy "Retired Community paths cannot be inserted"
  on storage.objects as restrictive for insert to authenticated
  with check (bucket_id <> 'comment-images' or not private.community_image_path_reserved(name));
create policy "Retired Community paths cannot be updated"
  on storage.objects as restrictive for update to authenticated
  using (bucket_id <> 'comment-images' or not private.community_image_path_reserved(name))
  with check (bucket_id <> 'comment-images' or not private.community_image_path_reserved(name));

create function private.validate_community_image_attachment()
returns trigger language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_object storage.objects%rowtype;
begin
  if tg_op = 'UPDATE' and new.image_path is not distinct from old.image_path then
    return new;
  end if;
  if new.image_path is null then return new; end if;
  if tg_table_name = 'comments' then
    -- Match the FK's lock order before locking the object. A concurrent parent
    -- DELETE either waits for this reference or makes attachment fail.
    perform 1 from public.posts where id = new.post_id for key share;
    if not found or new.image_path !~ (
      '^comments/' || new.post_id::text || '/[A-Za-z0-9_-]+\.(jpg|jpeg|png|webp|gif)$'
    ) then
      raise exception 'Invalid Community image attachment.' using errcode = '23514';
    end if;
  elsif new.image_path !~ '^posts/[A-Za-z0-9_-]+\.(jpg|jpeg|png|webp|gif)$' then
    raise exception 'Invalid Community image attachment.' using errcode = '23514';
  end if;

  select * into v_object from storage.objects
    where bucket_id = 'comment-images' and name = new.image_path for update;
  if not found or v_object.owner_id is distinct from new.author_id::text then
    raise exception 'Invalid Community image attachment.' using errcode = '23514';
  end if;
  -- Keep this separate from the locking SELECT: VOLATILE statements obtain a
  -- fresh READ COMMITTED snapshot after waiting for another attachment/delete.
  if exists (select 1 from private.community_image_cleanup
      where bucket_id = 'comment-images' and object_name = new.image_path) then
    raise exception 'This Community image path has been retired.' using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke all on function private.validate_community_image_attachment() from public, anon, authenticated;
create trigger posts_validate_image_attachment
  before insert or update of image_path on public.posts
  for each row execute function private.validate_community_image_attachment();
create trigger comments_validate_image_attachment
  before insert or update of image_path on public.comments
  for each row execute function private.validate_community_image_attachment();

create function private.enqueue_removed_community_image()
returns trigger language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_object storage.objects%rowtype;
begin
  if old.image_path is null or (tg_op = 'UPDATE' and new.image_path is not distinct from old.image_path) then
    return null;
  end if;
  -- OLD is authority only for a valid namespace and verified actual owner.
  -- Legacy forged references never authorize deleting somebody else's object.
  if tg_table_name = 'comments' then
    if old.post_id is null or old.image_path !~ (
      '^comments/' || old.post_id::text || '/[A-Za-z0-9_-]+\.(jpg|jpeg|png|webp|gif)$'
    ) then return null; end if;
  elsif old.image_path !~ '^posts/[A-Za-z0-9_-]+\.(jpg|jpeg|png|webp|gif)$' then
    return null;
  end if;
  select * into v_object from storage.objects
    where bucket_id = 'comment-images' and name = old.image_path for update;
  if not found or v_object.owner_id is distinct from old.author_id::text then return null; end if;
  -- SECURITY DEFINER deliberately sees references from every author. This
  -- separate post-lock query must not share a pre-lock statement snapshot.
  if exists (select 1 from public.posts where image_path = old.image_path)
    or exists (select 1 from public.comments where image_path = old.image_path) then return null; end if;
  insert into private.community_image_cleanup (object_id, object_name, owner_id)
    values (v_object.id, v_object.name, v_object.owner_id)
    on conflict (bucket_id, object_name) do nothing;
  return null;
end;
$$;
revoke all on function private.enqueue_removed_community_image() from public, anon, authenticated;
create trigger posts_enqueue_removed_image
  after delete or update of image_path on public.posts
  for each row execute function private.enqueue_removed_community_image();
create trigger comments_enqueue_removed_image
  after delete or update of image_path on public.comments
  for each row execute function private.enqueue_removed_community_image();

-- A successful attempt is not terminal: Storage 1.44.11 may finish a previously
-- authorized streaming upload with elevated privileges after path retirement.
-- Reconcile completed reservations that are occupied again on scheduled runs.
create function public.community_image_cleanup_list(p_limit integer default 100)
returns table (id bigint) language plpgsql volatile security definer set search_path = ''
as $$
begin
  if p_limit is null or p_limit < 1 or p_limit > 100 then
    raise exception 'Cleanup batch size must be between 1 and 100.' using errcode = '22023';
  end if;
  return query select candidate.id from (
    select t.id, t.last_attempt_at, t.requested_at
      from private.community_image_cleanup t where t.completed_at is null
    union all
    select t.id, t.last_attempt_at, t.requested_at
      from storage.objects o join private.community_image_cleanup t
        on t.bucket_id = o.bucket_id and t.object_name = o.name
      where o.bucket_id = 'comment-images' and t.completed_at is not null
  ) candidate
    order by candidate.last_attempt_at nulls first, candidate.requested_at, candidate.id limit p_limit;
end;
$$;

create function public.community_image_cleanup_dispatch(p_id bigint)
returns table (id bigint, bucket_id text, object_name text, owner_id text, state text)
language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_ticket private.community_image_cleanup%rowtype;
  v_owner text;
begin
  update private.community_image_cleanup t set last_attempt_at = clock_timestamp()
    where t.id = p_id returning t.* into v_ticket;
  if not found then return; end if;
  select o.owner_id into v_owner from storage.objects o
    where o.bucket_id = v_ticket.bucket_id and o.name = v_ticket.object_name;
  if not found then state := 'absent';
  elsif v_owner is distinct from v_ticket.owner_id then state := 'owner_mismatch';
  elsif exists (select 1 from public.posts p where p.image_path = v_ticket.object_name)
    or exists (select 1 from public.comments c where c.image_path = v_ticket.object_name)
    then state := 'referenced';
  else state := 'ready'; end if;
  if state in ('owner_mismatch', 'referenced') then
    update private.community_image_cleanup t set error_code = state where t.id = p_id;
  end if;
  return query select v_ticket.id, v_ticket.bucket_id, v_ticket.object_name, v_ticket.owner_id, state;
end;
$$;

create function public.community_image_cleanup_ack(p_id bigint)
returns boolean language plpgsql volatile security definer set search_path = ''
as $$
begin
  update private.community_image_cleanup t
    set completed_at = clock_timestamp(), object_id = null, error_code = null
    where t.id = p_id and not exists (select 1 from storage.objects o
      where o.bucket_id = t.bucket_id and o.name = t.object_name);
  return found;
end;
$$;

create function public.community_image_cleanup_error(p_id bigint, p_code text)
returns void language plpgsql volatile security definer set search_path = ''
as $$
begin
  if p_code is null or p_code not in ('storage_remove_failed', 'dispatch_failed',
      'ack_failed', 'object_restored', 'owner_mismatch', 'referenced', 'invalid_dispatch') then
    raise exception 'Invalid cleanup diagnostic code.' using errcode = '22023';
  end if;
  update private.community_image_cleanup t
    set error_code = p_code, last_attempt_at = clock_timestamp()
    where t.id = p_id and (t.completed_at is null or exists (select 1 from storage.objects o
      where o.bucket_id = t.bucket_id and o.name = t.object_name));
end;
$$;

revoke all on function public.community_image_cleanup_list(integer),
  public.community_image_cleanup_dispatch(bigint), public.community_image_cleanup_ack(bigint),
  public.community_image_cleanup_error(bigint, text) from public, anon, authenticated;
grant execute on function public.community_image_cleanup_list(integer),
  public.community_image_cleanup_dispatch(bigint), public.community_image_cleanup_ack(bigint),
  public.community_image_cleanup_error(bigint, text) to service_role;

comment on table private.community_image_cleanup is
  'Private desired-absence tickets and permanent Community path reservations; origin deletion uses Storage API.';
notify pgrst, 'reload schema';
commit;
