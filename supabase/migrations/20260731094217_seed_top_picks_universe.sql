-- Curated union of the Australia-first equity defaults used by the app's
-- trending and market-news scopes. Market indices are benchmark inputs, not
-- rankable companies, so they are deliberately excluded.
with top_picks_universe(symbol, name, industry) as (
  values
    ('ANZ.AX', 'ANZ Group Holdings Limited', 'Financials'),
    ('BHP.AX', 'BHP Group Limited', 'Materials'),
    ('CBA.AX', 'Commonwealth Bank of Australia', 'Financials'),
    ('CSL.AX', 'CSL Limited', 'Health Care'),
    ('MQG.AX', 'Macquarie Group Limited', 'Financials'),
    ('NAB.AX', 'National Australia Bank Limited', 'Financials'),
    ('RIO.AX', 'Rio Tinto Limited', 'Materials'),
    ('TLS.AX', 'Telstra Group Limited', 'Communication Services'),
    ('WBC.AX', 'Westpac Banking Corporation', 'Financials'),
    ('WES.AX', 'Wesfarmers Limited', 'Consumer Discretionary'),
    ('WOW.AX', 'Woolworths Group Limited', 'Consumer Staples'),
    ('XRO.AX', 'Xero Limited', 'Information Technology')
)
insert into public.tickers (symbol, name, industry)
select universe.symbol, universe.name, universe.industry
from top_picks_universe as universe
where not exists (
  select 1
  from public.tickers as existing
  where upper(btrim(existing.symbol)) = universe.symbol
);
