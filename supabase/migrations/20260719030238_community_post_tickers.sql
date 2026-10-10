-- Structured Community tickers. Position 0 is the backward-compatible primary ticker.

create table public.post_tickers (
  post_id uuid not null
    references public.posts(id) on delete cascade,
  symbol text not null,
  position smallint not null,
  created_at timestamptz not null default now(),
  primary key (post_id, symbol),
  unique (post_id, position),
  constraint post_tickers_symbol_check check (
    symbol = upper(btrim(symbol))
    and symbol ~ '^[A-Z0-9][A-Z0-9.\-^=]{0,23}$'
  ),
  constraint post_tickers_position_check check (position between 0 and 3)
);

comment on table public.post_tickers is
  'Ordered tickers explicitly selected by a Community post author; at most four per post.';

alter table public.post_tickers enable row level security;

create policy "Community post tickers are publicly readable"
  on public.post_tickers
  for select
  to anon, authenticated
  using (true);

create policy "Community authors can add post tickers"
  on public.post_tickers
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.posts
      where posts.id = post_tickers.post_id
        and (select auth.uid()) = posts.author_id
    )
  );

revoke all on table public.post_tickers
  from public, anon, authenticated, service_role;
grant select on table public.post_tickers to anon, authenticated;
grant insert (post_id, symbol, position)
  on table public.post_tickers to authenticated;
grant all on table public.post_tickers to service_role;

insert into public.post_tickers (post_id, symbol, position)
select id, symbol, 0
from public.posts
where symbol is not null
on conflict do nothing;

create index post_tickers_symbol_idx
  on public.post_tickers(symbol);
