# ETF preview window integrity (#284)

Validated against DevBranch `3e36a257ca27a522deac6724876a6ca5adc7cb1e` on 2026-10-09 in an isolated worktree. The ETF service remains the disclosed hardcoded preview; live-data issue #257 is outside this change.

| Requirement | Decision and refinement | Verification |
| --- | --- | --- |
| Rows, summaries, warnings, and generation time describe the requested window | Store one atomic response with its request window; immediately hide a preceding window's snapshot. Reject missing, invalid, or mismatched response `windowCode`. | Deferred Year → Day failure/retry regression, matching/mismatched API contract tests, Chromium window-switch journey. |
| Only the active request controls success, error, and loading | Use effect-local ownership plus transport abort. Cleanup removes ownership before aborting; no shared `finally` can finish another request. | Deferred obsolete success/error/abort while current request loads, Year → Day → Year completion ordering, unmount/remount tests. |
| Missing required financial fields never become zero | Reject rows without finite numeric expense, AUM, or return. Preserve real numeric zero and keep optional risk metrics nullable. | Missing/null/string/NaN/infinity cases for each required field; real-zero and optional-null API regressions; Chromium invalid/empty/zero journey. |
| Failure and empty results are usable and truthful | Show a window-specific live status or error alert, clear old generation time, provide Retry for errors/empty results, and retain the hardcoded-preview disclosure in every state. | Renderer status/retry assertions and both Chromium journeys. |

Source inspection compared hiding prior results with retaining a separately labelled previous snapshot. Hiding was selected because it keeps every existing summary and timestamp tied to one result without introducing an additional displayed-window control. Required-field rejection was selected over nullable mandatory metrics because the existing ETF row and summary contract requires numbers. This was a bounded technical design comparison, not a human A/B study.

## Executed checks

From `client/`, with the worktree linked to the already installed audit dependencies:

```powershell
node node_modules/jest/bin/jest.js --config jest.config.js --runInBand --cacheDirectory .next/jest-cache --runTestsByPath features/etf/api/fetchEtfs.test.ts features/etf/screens/EtfScreen.test.tsx
```

The pre-implementation run reproduced 15 failures and 9 passes. The first external-binary attempt had mixed ancestor React versions, so it is recorded as setup failure rather than regression evidence. A worktree-local dependency junction resolved that mismatch without installing or copying packages.

```powershell
node node_modules/jest/bin/jest.js --config jest.config.js --runInBand --cacheDirectory .next/jest-cache --runTestsByPath features/etf/api/fetchEtfs.test.ts features/etf/screens/EtfScreen.test.tsx --coverage --collectCoverageFrom='features/etf/**/*.{ts,tsx}' --collectCoverageFrom='!features/etf/**/*.test.{ts,tsx}' --collectCoverageFrom='!features/etf/index.ts' --collectCoverageFrom='!features/etf/types.ts' --coverageDirectory=coverage/etf --coverageReporters=text --coverageReporters=json-summary
node node_modules/next/dist/bin/next typegen
node node_modules/typescript/bin/tsc --noEmit --pretty false
node node_modules/eslint/bin/eslint.js features/etf tests/e2e/etf --no-cache
git diff --check
```

PASS: 24 unit tests; type generation and TypeScript; focused lint with no warnings; diff whitespace check. Coverage of the two production ETF files excludes tests, the export-only index, and types: 97.77% lines, 97.97% statements, 96.07% branches, 93.54% functions. Both files individually exceed 80% in every measured category. The JSON summary is local ignored output under `client/coverage/etf/`.

Chromium PASS: 2 tests, zero retries, using existing browser build 1228 and a task-specific local Next server on port 3144. The temporary Playwright config in ignored `client/test-results/` only selects the ETF spec and that server; the tracked spec also runs under the repository's existing Playwright configuration. Initial sandbox browser-cache lookup and local navigation attempts failed before app interaction. Explicit existing browser-cache selection and scoped host execution resolved those infrastructure failures without installing a browser or changing repository sandbox settings.

Browser responses are controlled fixtures. These checks establish frontend window, failure, retry, empty, and metric semantics; they do not establish live ETF accuracy, deployed behavior, backend integration, or human acceptance.

Parent verification: `npm run build` passed against the unchanged locked dependencies. A fresh-context independent reviewer examined the complete patch and tests, reran both suites (24 passed), and reported no actionable findings; it did not rerun browser/coverage checks. The current DevBranch general Jest baseline has one separate Guide text assertion failure (1,168 passing), and the dependency audit has pre-existing findings outside this patch. Complete combined-candidate checks and publication remain separate integration evidence.
