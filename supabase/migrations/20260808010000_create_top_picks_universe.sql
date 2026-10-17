create table if not exists public.top_picks_universe (
  symbol text primary key,
  name text not null,
  industry text not null default 'Unknown',
  market text not null,
  source text not null,
  active boolean not null default true,
  updated_at timestamp with time zone not null default now(),
  constraint top_picks_universe_symbol_check check (
    symbol = upper(btrim(symbol))
    and symbol ~ '^[A-Z0-9^][A-Z0-9.^=-]{0,14}$'
  ),
  constraint top_picks_universe_market_check check (
    market in ('US', 'AU', 'HK')
  ),
  constraint top_picks_universe_source_check check (
    source in ('SP500', 'ASX200', 'HSI', 'LEGACY', 'MANUAL')
  )
);

alter table public.top_picks_universe enable row level security;

drop policy if exists "Top Picks universe is readable"
  on public.top_picks_universe;
create policy "Top Picks universe is readable"
  on public.top_picks_universe
  for select
  using (active = true);

grant select on table public.top_picks_universe to anon, authenticated;
grant all on table public.top_picks_universe to service_role;

create index if not exists top_picks_universe_active_symbol_idx
  on public.top_picks_universe(active, symbol);

insert into public.top_picks_universe (
  symbol,
  name,
  industry,
  market,
  source,
  active,
  updated_at
)
select
  upper(btrim(symbol)) as symbol,
  coalesce(nullif(btrim(name), ''), upper(btrim(symbol))) as name,
  coalesce(nullif(btrim(industry), ''), 'Unknown') as industry,
  case
    when upper(btrim(symbol)) like '%.AX' then 'AU'
    when upper(btrim(symbol)) ~ '^[0-9]{1,5}\.HK$' then 'HK'
    else 'US'
  end as market,
  'LEGACY' as source,
  true as active,
  now() as updated_at
from public.tickers
where symbol is not null
  and upper(btrim(symbol)) ~ '^[A-Z0-9^][A-Z0-9.^=-]{0,14}$'
on conflict (symbol) do update
set
  name = excluded.name,
  industry = excluded.industry,
  market = excluded.market,
  active = true,
  updated_at = excluded.updated_at;
