# Top Picks persistence recovery (#286, #287)

Base: `3e36a257ca27a522deac6724876a6ca5adc7cb1e`. Local branch:
`fix/286-287-market-persistence`. Python 3.12.14 with the shared pinned direct
requirements; no live providers, Supabase changes, commit or push.

## Requirements and acceptance

- Malformed JSON root, entry/latest key or production snapshot value must not
  prevent lazy construction or be served as a valid ranking. Log a static warning
  without cache contents. Isolate invalid records and retain valid contexts.
- Preserve the existing stale-on-restart behavior and original snapshot dates;
  cached data must not acquire a new generation timestamp.
- A full reconciliation must preserve every previously usable observation in
  the retained range. Missing a known prefix, suffix or interior observation
  rejects the whole replacement. Do not merge prices from different adjusted
  bases. Preserve old dates and reconciliation time; omit the rejected symbol
  from that fresh calculation and retry full reconciliation on the next call,
  including after restart.
- Coverage preservation uses known usable dates, not all calendar or business
  days. Sparse/new listings, holidays and preexisting NaNs remain valid. Stored
  `start`/`end` describe the accepted request; they do not certify every unknown
  trading day. `last_refresh` reports requested bounds separately from observed
  usable ranges and counts. The provider exposes no independent completeness
  flag, so the invariant is preservation of known observations.

## Controlled comparison

Predeclared candidates: blind full replacement, merging a full response into
old prices, and validated full replacement. The changed factor is reconciliation
policy. All candidates receive the same old adjusted series and the same full
response at fixed dates. Fixtures: a half-price adjusted response missing its
prefix, suffix or one interior bar; a complete sparse half-price response is the
valid control. Criteria: retain known observations, keep one consistent adjusted
basis, and do not advance coverage/reconciliation after rejection. Stop after
each fixed fixture has been evaluated once; this is a correctness comparison,
not a performance or provider reliability study.

Executed in the pinned Python environment, one run per fixture. Counts below
are missing previously usable bars; the basis check compares the exact series
with the original and fully adjusted controls.

| Fixture | Blind replacement | Merge | Validated replacement |
| --- | --- | --- | --- |
| Missing prefix | Loses 2 bars, advances reconciliation | Keeps bars, mixes bases, advances reconciliation | Retains exact old basis, no advance |
| Missing suffix | Loses 2 bars, advances reconciliation | Keeps bars, mixes bases, advances reconciliation | Retains exact old basis, no advance |
| Interior gap | Loses 1 bar, advances reconciliation | Keeps bars, mixes bases, advances reconciliation | Retains exact old basis, no advance |
| Sparse complete control | Exact new basis | Exact new basis | Exact new basis, accepted |

After independent review, the same comparison was rerun against the refined
policy: identical results, and a recent-listing control with only October 1/2
bars is accepted for an annual request. No earlier trading bars are invented.

The integration regressions separately verify SQLite state, unavailable-symbol
reporting, unchanged retained bounds/freshness, and next-call full retry across
both weekly and adjustment paths and process restart.

## Actual checks

- Initial red command: `python -m pytest
  tests/top_picks/test_snapshot_persistence_validation.py
  tests/top_picks/test_history.py -k 'invalid or incomplete_reconciliation or
  sparse_calendar' -q --tb=short --basetemp=.pytest_tmp_persistence_red
  -o cache_dir=.pytest_cache_persistence`: **34 failed, 1 passed, 25 deselected**.
  Failures reproduced malformed-root AttributeError, unhashable nested keys,
  malformed values reaching pagination, and all 12 truncated reconciliations.
- Focused initial green: cache, history, context and service tests: **105 passed**.
- Additional initial coverage-extension/oversized-metric probes: **3 failed,
  11 passed, 49 deselected**. After refinement, complete cache/history files:
  **63 passed**. Added three first-lazy-HTTP construction regressions. The
  extension acceptance rule was subsequently corrected after independent review;
  lack of earlier/newer bars alone is not evidence of a truncated response.
- Broader initial run: **7 failed, 126 passed**. Investigation exposed an actual
  compatibility regression from writing the optional retry field on successful
  entries; corrected serialization keeps successful history in its original
  format. Subsequent API runs (**7 failed, 21 passed**, then **5 failed,
  23 passed** with workspace TEMP/TMP) isolated Windows sandbox SQLite temporary
  backup and atomic-file-install access failures. No assertions were weakened.
- First unsandboxed full suite: **397 passed**. After the initial extension,
  oversized-metric and lazy-HTTP tests, pre-review `python -m pytest tests -q
  --tb=short --basetemp=.cache/persistence-full-final
  -o cache_dir=.pytest_cache/persistence`: **403 passed**, **2 existing
  dependency deprecation warnings**, **18.23 seconds**, exit **0**. Used
  justified sandbox escalation and workspace TEMP/TMP; all data was synthetic.
- Independent review reproduced three defects: missing pending state after
  empty/omitted/exception full fetches, rejection of a legitimate recent listing,
  and contradictory nested assumptions accepted as stale. New/updated probes:
  **21 failed, 13 passed, 52 deselected**. The omission fixture initially exposed
  the normalizer's documented-by-source single-column relabel behavior; after
  supplying two unrelated columns, all **4 omission cases** failed specifically
  on absent pending state. No price/date/basis assertions were removed.
- Refinement records pending state before each full download and immediately
  on adjustment detection, validates only known finite anchors, distinguishes
  requested and observed bounds, and checks recognized nested assumptions plus
  top-level window method against the cache key. A matching assumptions-only
  legacy snapshot is retained as the positive control.
- First focused refinement check: **6 failed, 80 passed**; all six failures
  isolated the preexisting loss of the Series name during SQLite reload. Reload
  now restores the canonical ticker name while retaining exact price/date checks.
- Final reviewed suite: `python -m pytest tests -q --tb=short
  --basetemp=.cache/persistence-reviewed-full -o cache_dir=.pytest_cache/persistence`:
  **423 passed**, **2 existing dependency warnings**, **16.57 seconds**, exit **0**.
  Used the same pinned environment, justified sandbox escalation and workspace
  TEMP/TMP. Compileall and complete configured flake8 also reran with exit 0.
- `python -m compileall -q src tests`: PASS, exit 0.
- CI's fatal flake8 selection `E9,F63,F7,F82`: PASS, exit 0.
- CI's complete configured flake8 style command (complexity 10, line length
  250 and existing ignore list): PASS, exit 0. Original native repro showed
  callback F811 and history W504; both are repaired without behavior changes.
- Final diff check: PASS. Reviewed changes for unintended files and credential
  exposure; generated test scratch files were removed or placed under ignored
  runtime directories. Coverage measurement NOT RUN: coverage tooling is absent
  from the pinned environment and manifest; no percentage is claimed.

## Implementation boundaries

Snapshot validation applies the complete ranking schema/context to production
seven-part keys; other cache namespaces retain their existing dictionary values.
Legacy production snapshots with omitted optional metadata remain compatible,
including matching assumptions-only metadata, while contradictory supplied
top-level/nested context and invalid rows/metrics are rejected.
Valid persisted rankings still load as stale startup fallbacks.

History retry state is saved before every full attempt, including adjustment
detection, and remains after empty/omitted responses, exceptions or interruption.
It is an optional flag only on unverified runtime payloads.
Successful entries retain the seed exporter's existing `dates`/`values` format.
The current strict seed exporter refuses entries carrying unverified retry state,
so a failed reconciliation cannot produce a new accepted seed package.
The seed callback rename preserves the same enabled/disabled conditions and
arguments; its existing behavior tests cover the native lint repair.

Independent fresh review and final combined branch verification belong to the
parent task. Live provider correctness and deployed behavior are not established
by synthetic fixtures.
