# Financial calculation contracts, 10 October 2026

This change addresses FIT #298 against DevBranch
`722e6a2a78f6f853b7026fde10f0820a9067fa5e`. All inputs used for verification
were local deterministic fixtures or the existing archived market seed. No live
market provider or Supabase data was queried.

## Price and return policy

`market_primitives.clean_prices` accepts numeric, finite, positive prices and
preserves the supplied index. `calculate_returns` uses adjacent supplied rows
without filling missing prices. An explicitly missing price invalidates both
return pairs that touch it. Returns that overflow are also excluded.

Adjusted Close is selected independently for each symbol. Close is used for the
whole symbol only when no usable Adjusted Close value exists. It is never spliced
into a partially available adjusted series. This handles field-first and
symbol-first Yahoo columns and the single-symbol layout.

Standalone Sortino, volatility and historical VaR now share this policy with
Sharpe, benchmark calculations and yearly batch calculations. Arithmetic
annualisation remains 252; sample volatility uses `ddof=1`; Sortino uses the full
sample of downside shortfall against the annual target divided by 252. Existing
two-return, twenty-return and twenty-one-aligned-return minimums remain in place.
Cumulative return and drawdown continue to use observed price levels.

Sortino distinguishes insufficient samples (`limited_data`), a positive excess
return with zero downside (`infinite`), and zero excess return with zero downside
(`invalid`, with an explicit reason). Modern and legacy metric routes normalize
nonfinite numeric values to JSON null, including nested arrays and NumPy scalars.
Empty or entirely unavailable correlation rows do not count as an available
requested result. A real finite coefficient, including valid self-correlation,
can be displayed. Missing matrix pairs remain N/A; a benchmark-only row does not
make an absent requested stock available.

## Short windows

The selected endpoints remain the last 2, 6 or 22 observed prices for 1D, 1W and
1M. Daily volatility, availability gates and `observationsBySymbol` use adjacent
valid returns from the supplied rows between those endpoints. A 1D result requires
one adjacent return from two prices; a missing row between the last two observed
prices makes that result unavailable. The 1W and 1M gates remain two returns for
endpoint return/drawdown and three/ten returns respectively for volatility. The
one-year history gate remains 200 returns.

No exchange calendar is inferred. A date absent from the entire provider input
cannot be distinguished from a closure. A date present only because another
symbol trades there remains a supplied missing-price row for the first symbol.
Mixed foreign exchange calendars can therefore exclude valid returns around
closures; this policy establishes adjacency on the provided index, not an
exchange-aware definition of a trading day.

## Snapshot and seed compatibility

The shared calculation version is 2. Snapshot keys are
`[namespace, window, benchmark, riskFreeRate, universeLimit, calculationVersion,
start, end]`; snapshot metadata includes `calculationVersion`. Previous
seven-field calculation keys are not loaded as stale ranking fallbacks. They are
not silently relabeled or exported as version 2.

The shipped `data/top-picks-seed.zip` remains unchanged. Its SHA-256 is
`58add7b3a90461e93f4015f87392a13d01ada2c55bdf0b41cc6b2ab2fb8db4dd`.
It contains calculation-version-one results and 699 raw history records. All
history date arrays match, and 5,154 values are explicitly null. The existing
history format preserves those dates and can be reused under the new price
policy. A verified version-one package therefore installs missing history only;
its obsolete ranking snapshots are declined. The first ranking request after
upgrading requires calculation. Existing history may support incremental reuse,
with the ordinary reconciliation policy still determining the download range.
Once a complete version-two refresh is available, the normal exporter creates a
version-two package. No bundled rankings were regenerated or claimed here.

## Requirement and evidence trail

| Requirement | Controlled evidence | Result and refinement |
| --- | --- | --- |
| No daily returns across a missing endpoint | Prices `[100,110,missing,99,118.8,95.04]`, with missing/null/text/zero/negative/infinite alternatives | Only 10%, 20%, -20% remain: volatility `sqrt(10.92)`, Sharpe `8.4/sqrt(10.92)`, Sortino `8.4/sqrt(3.36)`, three observations. Standalone, batch and short-window results agree. |
| Calendar omission differs from an explicit missing row | Supplied dates 2, 6 and 7 January; compared with explicit internal missing rows | No calendar rows invented; explicit missing endpoints excluded. |
| Leading IPO gaps do not reduce another symbol's sample | Leading gaps for IPO alongside a complete older symbol | Counts are three and five independently. |
| Fallback preserves one price basis | Partly missing adjusted AAA, unusable adjusted BBB, Close-only CCC, both column orientations | AAA gaps remain; BBB and CCC use their entire Close series. |
| Minimum samples remain meaningful | Internal gap reduces 21 nominal VaR returns to 19 adjacent valid returns | VaR omitted. Rolling correlation fixture has no continuous 21-return interval and does not compact missing rows. |
| Sortino states represent the numerator and denominator | Flat at zero target, increasing above target, flat with positive/negative target, insufficient adjacency | Invalid / infinite / finite negative / limited states verified with independent arithmetic. |
| Short counts match actual calculation | Fifty prices produce counts 1/5/21 in 1D/1W/1M; internal gaps and limited histories | Exact sample metadata and existing 1W/1M gates verified. |
| JSON is standard and coverage is truthful | Strict decoder rejects NaN/Infinity; scalar/nested/frontier and partial correlation fixtures | Finite/null normalization and requested correlation coverage verified on Flask responses; finite diagonal values retained, empty/all-null requested rows unavailable, missing pairs not fabricated. |
| Old derived metrics cannot masquerade as new calculations | Old persisted snapshot, original version-one seed, export attempt using old entries | Recalculation required; native history-only seed install verified; old metrics cannot be exported as version 2. |
| History retains gaps through persistence | SQLite round trip including zero price | Zero persisted as null; exact date array and three-return count preserved after restart. |

The initial policy fixtures failed with the expected gap, fallback, Sortino and
JSON defects (19 failed, 6 passed). Version fixtures reproduced old-result loading
and export. Short-window metadata controls reproduced broad-range counts (5
failed, 3 passed). An initial full run also identified three expectations tied to
the old calculation version; those tests now require version 2 and recalculation.

Verification used Python 3.12 with the existing readiness venv: NumPy 2.2.6,
pandas 2.3.1 and yfinance 0.2.65. Required backend compile and both configured
flake8 checks passed. The full backend suite passed **406 tests**, with the two
existing Supabase dependency deprecation warnings. Native bootstrap/history
publication was verified outside the filesystem sandbox using task-local TEMP
and pytest basetemp directories; production publication code was unchanged.
A later legacy-adapter helper rename was verified with its affected API tests.
Coverage was not measured because coverage tooling is not installed in that
existing runtime. This is provider-isolated backend evidence; browser flows and
live-provider behavior are not established by these checks. Independent review
and integration verification are owned by the parent task.

## Integration boundaries

For pending persistence/refresh changes, reconcile these exact sections:

- `service.py`: imports, `WINDOW_MIN_OBSERVATIONS`, production-version validation
  inside `_valid_persisted_value`, `_snapshot_cache_prefix`, `_calculate_metric_maps`,
  `_calculate_short_window_metric_maps`, and `_build_snapshot_metadata`.
- `history.py`: import and `_clean_series` only; storage schema, retention,
  reconciliation and download scheduling are unchanged.
- `bootstrap.py`: shared version import/constant, metadata field allowlist,
  `_prepare_snapshots` versioned key layout, `_read_seed` supported calculation
  versions, and the history-only installation rule in `bootstrap_top_picks_cache`.

## Final integration with persistence recovery

The owned 17-file calculation change was checkpointed locally as
`d9f79e3e5`. It was then merged with verified `origin/DevBranch`
`1536678c31704ce25027aad6fd7aa71151ac4950`, which includes #306 persistence
recovery. The text merge was clean, but eight-field calculation keys bypassed
the merged validator because its production branch recognized seven fields only.
Upgrading the existing corruption controls to version-two keys and adding
metadata-version mismatch regressions reproduced **19 failures, 25 passes**.

The existing `_valid_persisted_value` now recognizes eight-field production keys,
requires shared calculation version 2 and matching `metadata.calculationVersion`,
and retains #306's row, metric, supplied top-level context and nested assumptions
checks. Its short/generic dictionary-cache behavior remains compatible. The
existing prefix derivation already includes the version in eight-field keys.
Version rejection is centralized in the validator so invalid entries are
diagnosed without hiding a compatible snapshot from the same context.

The matching assumptions-only positive control now declares calculation version
2; a separate generic legacy-cache positive control preserves the older cache
client contract. New checks cover a cold calculation followed by same-context
stale startup fallback, cross-benchmark isolation, missing/wrong metadata version,
and a wrong-version latest key coexisting with a usable current snapshot. Old
version-one production rankings still cannot be loaded or exported.

#306's persisted retry intent, known adjusted-price anchor protection, recent
listing support and restoration of ticker Series names are preserved. Against
the merged DevBranch, history changes are only the import and shared price
cleaner; retry/coverage logic is unchanged. No #291 refresh implementation was
copied into this branch.

The repaired snapshot/bootstrap/history/context focused run passed **171 tests**;
the additional wrong-key-version controls passed **3 tests**. Final integrated
verification passed **476 backend tests**, with the same two dependency warnings,
in **11.36 seconds**, exit 0. Compileall and both exact backend CI flake8 commands
passed, exit 0. Verification used the same pinned readiness runtime and justified
sandbox escalation for native file publication. The shipped seed hash is
unchanged. Independent review of the integration delta belongs to
`financial_contract_review`; final refresh integration remains with the parent.

### Normal correlation input refinement

A bounded normal-input check found that requesting `SPY` with `SPY` as the
benchmark incorrectly returned no result despite 35 nonconstant valid price
observations. The earlier off-diagonal availability condition suppressed its
valid self-correlation. The calculator and HTTP positive controls both failed
before correction.

The actual frontend matrix contract permits one symbol, retains finite diagonal
coefficients and renders absent cells as null/N/A (`metricRegistry.ts`,
`normaliseCorrelationMatrix` and `toCorrelationHeatMapModel`). The shared helper
was therefore simplified to `has_finite_correlation(row)`: a nonempty row with a
real finite coefficient is displayable. No symbol/peer restrictions are added.
Requested-symbol metadata still requires that requested symbol's row; empty,
all-null and benchmark-only responses do not claim an unavailable stock.
The two normal self-correlation controls and preserved missing-data controls
passed in the focused **33-test** run. Final pinned backend verification passed
**478 tests**, with the same two dependency warnings; compileall and both exact
CI flake8 checks passed. No frontend code, calculation version, provider access
or persistence policy changed in this refinement.

### Integration with the approved refresh bounds

After the normal-input correction at local `3ad937439`, this branch merged
verified `origin/DevBranch` `12d52c08ca6b00636f77a6994574cb2be8ef7ded`, which
includes #311's approved #291 refresh implementation. Git reported no text
conflicts. No additional source repair was needed: composition matches that
upstream revision, and the service diff against it is confined to the existing
financial sample policy and version-two snapshot validation/metadata.

The merged cooldown, coalesced manual intent, subscriber-only worker stop and
reconnect controls remain intact. The #306 validator still checks version-two
production context, corrupt rows and nested assumptions, while generic legacy
cache dictionaries and compatible same-context stale snapshots remain supported.
The normal benchmark self-correlation correction is retained. Earlier references
to pending refresh integration above describe the preceding checkpoint.

The focused refresh bounds/comparison, live updates/shared windows, calculation
version, persistence validation, snapshot context and configuration group passed
**150 tests**. Final pinned verification passed **504 backend tests**, with the
same two dependency warnings, in **12.62 seconds**, exit 0. Compileall and both
exact CI flake8 commands passed, exit 0; staged and working-tree diff checks
passed. The seed archive SHA-256 is unchanged. These are local synthetic checks;
no live provider, Supabase action, push or PR occurred.

### External successful-response parsing

Backend finite/null normalization ensures that numerical values emitted by the
metric routes are standard JSON. It does not validate a malformed successful
body arriving at the frontend. The client previously swallowed `Response.json()`
failure as `{}`, which turned unreadable HTTP 200 data into a normal empty result.
This #298/#299 acceptance boundary is now fixed separately in `fetchMetrics`.

Parsing failure uses a null sentinel. A successful response must be a record;
otherwise the client throws the safe retryable message
`The metrics response could not be read. Please try again.` A valid `{}` remains
a legitimate empty result, and normal envelope/raw legacy responses still reach
the existing normalizer. Non-2xx non-JSON responses keep the existing generic
unavailable error; normal JSON errors remain compatible. No deeper schema or
validator framework was introduced.

Real native `Response` fixtures reproduced **5 failures, 8 passes** before the
fix: malformed success JSON and successful null/array/scalar bodies incorrectly
resolved as empty data. After correction, **13 client tests** and **20 Portfolio
hook tests** passed, including existing empty/error/retry controls. The configured
Portfolio/Top Picks coverage suite passed **47 suites, 305 tests** and all its
coverage gates. Portfolio aggregate coverage was **93.03% lines, 88.76% branches,
92.33% functions, 92.53% statements**; the affected `client.ts` measured **100%
lines, 93.75% branches, 100% functions, 94.44% statements**.

`npm run typecheck` (Next typegen and TypeScript), affected-file ESLint and
Prettier checks passed. Formatting initially required correction and was applied
only to the two owned client files; the 13-test client suite passed afterward.
Tests used Node 24.15.0 and reused the existing dependency directory after
verifying identical lockfile SHA-256, with workspace-local Jest caches. Metrics network calls were
mocked. Backend code was unchanged, so its previous 504-test verification was
not repeated or presented as new frontend evidence. This is a three-file local
follow-up; no browser or CI Node-22 run is claimed. The parent owns updating the
existing PR and combined verification.

## Primary references

- [pandas 2.3 pct_change](https://pandas.pydata.org/pandas-docs/version/2.3/reference/api/pandas.DataFrame.pct_change.html): default change is from the immediately previous supplied row; use `fill_method=None`.
- [pandas 2.3 std](https://pandas.pydata.org/pandas-docs/version/2.3/reference/api/pandas.DataFrame.std.html): sample standard deviation defaults to `ddof=1`.
- [Python 3.12 JSON](https://docs.python.org/3.12/library/json.html): nonfinite extensions are rejected by strict JSON encoding/decoding controls.

The existing inclusive UI end plus one day remains unchanged; the parent
documentation review verified yfinance 0.2.65's exclusive end convention.
