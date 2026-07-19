-- Atomically creates a Community post and its canonical ordered ticker rows.

create or replace function public.create_community_post_with_tickers(
  p_title text,
  p_body text,
  p_tags text[],
  p_post_type text,
  p_time_frame text,
  p_tickers text[],
  p_source_url text,
  p_image_url text,
  p_image_path text
)
returns setof public.posts
language plpgsql
security invoker
set search_path = ''
as $$
declare
  new_post public.posts%rowtype;
  v_tickers text[] := coalesce(p_tickers, '{}'::text[]);
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication is required.';
  end if;

  if cardinality(v_tickers) > 4 then
    raise exception 'Add up to 4 tickers.';
  end if;

  if exists (
    select 1
    from unnest(v_tickers) as ticker
    where ticker is null
      or ticker <> upper(btrim(ticker))
      or ticker !~ '^[A-Z0-9][A-Z0-9.\-^=]{0,23}$'
  ) then
    raise exception 'Enter valid normalized tickers.';
  end if;

  if cardinality(v_tickers) <> (
    select count(distinct ticker)
    from unnest(v_tickers) as ticker
  ) then
    raise exception 'Ticker symbols must be unique.';
  end if;

  insert into public.posts (
    title,
    body,
    tags,
    post_type,
    time_frame,
    symbol,
    source_url,
    image_url,
    image_path,
    author_id
  )
  values (
    p_title,
    p_body,
    p_tags,
    p_post_type,
    p_time_frame,
    v_tickers[1],
    p_source_url,
    p_image_url,
    p_image_path,
    (select auth.uid())
  )
  returning * into new_post;

  insert into public.post_tickers (post_id, symbol, position)
  select
    new_post.id,
    ticker,
    (ordinality - 1)::smallint
  from unnest(v_tickers) with ordinality as ordered_ticker(ticker, ordinality);

  return next new_post;
end;
$$;

comment on function public.create_community_post_with_tickers(
  text, text, text[], text, text, text[], text, text, text
) is 'Atomically creates one Community post and up to four ordered ticker rows.';

revoke execute on function public.create_community_post_with_tickers(
  text, text, text[], text, text, text[], text, text, text
) from public, anon, authenticated;

grant execute on function public.create_community_post_with_tickers(
  text, text, text[], text, text, text[], text, text, text
) to authenticated;

grant execute on function public.create_community_post_with_tickers(
  text, text, text[], text, text, text[], text, text, text
) to service_role;

create or replace function public.validate_community_post_ticker_primary()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.post_tickers as ticker
    join public.posts as post on post.id = ticker.post_id
    where ticker.post_id = new.post_id
      and ticker.position = 0
      and ticker.symbol = post.symbol
  ) then
    raise exception 'Community tickers require a matching primary ticker at position 0.';
  end if;

  return null;
end;
$$;

revoke execute on function public.validate_community_post_ticker_primary()
  from public, anon, authenticated;

create constraint trigger post_tickers_primary_consistency
after insert or update on public.post_tickers
deferrable initially deferred
for each row
execute function public.validate_community_post_ticker_primary();
