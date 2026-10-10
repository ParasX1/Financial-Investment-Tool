# Runtime image dependency repair (#294)

Checked on 2026-10-10 against DevBranch `1536678c31704ce25027aad6fd7aa71151ac4950` in an isolated worktree. This change pins the runtime decoder, preserving Next.js 15.5.27, React 18 and the Pages Router.

## Decision and reachability

The baseline locks Sharp 0.34.5. The official [libvips advisory](https://github.com/advisories/GHSA-f88m-g3jw-g9cj), [libheif advisory](https://github.com/advisories/GHSA-rgj7-g3m4-5g8c) and [librsvg advisory](https://github.com/advisories/GHSA-wq5f-xc86-pv6w) require Sharp 0.35.0, 0.35.4 and 0.35.5 respectively. The [stable 0.35.5 release](https://github.com/lovell/sharp/releases/tag/v0.35.5) and npm metadata were checked before editing.

Next 15.5.27 accepts Sharp `^0.34.3 || ^0.35.4`. An exact direct runtime dependency on 0.35.5 makes the required decoder explicit and deduplicates with Next; an override would add no resolution benefit for this compatible range. Its Node >=20.9 requirement fits the documented Node >=22 setup and CI Node 22. Lockfile version changes are confined to Sharp, its native packages and the associated WASM runtime dependency.

`client/next.config.mjs` leaves the default image optimizer enabled. `/_next/image` validates its source, fetches a permitted local image, then passes its buffer through `imageOptimizer` and Sharp. Defaults permit local paths, reject remote image hosts and reject SVG; Next also bypasses animated image transformations and unsafe older AVIF decoders. These guards mean the three advisories are not equally reachable through this route.

The located `next/image` consumers in Home and Footer use bundled assets. Profile and Community uploads go directly to storage and render with native `<img>` elements. No current user-upload-to-Sharp path or attacker-controlled local image response was established. Updating the native decoder removes affected dependency versions; it does not prove that the application was exploitable.

## Verification

The initial exact-version assertion failed on 0.34.5. A fresh locked `npm ci` used this worktree's own dependency tree, npm cache and temporary directory; the original checkout was untouched.

| Check | Result |
| --- | --- |
| Next resolution and native versions | One Sharp 0.35.5 copy, used by Next; Windows prebuilt libvips 8.18.7, libheif 1.23.5, librsvg 2.63.2 |
| Benign JPEG, PNG, WebP and AVIF | Metadata and resize pass; Next `optimizeImage` produces valid 32-pixel WebP from all four formats |
| Malformed non-image buffer | Native metadata and Next `optimizeImage` both reject it |
| `npm run typecheck` | Pass |
| `npm run lint -- --no-cache` | Pass; two existing `<img>` warnings |
| `npm test -- --ci --runInBand` | 230 suites / 1,193 tests pass |
| `npm run test:portfolio-top-picks:coverage -- --ci` | Pass; statements/branches/functions/lines 93.85/88.63/93.13/95.00% |
| `npm run test:watchlist:coverage -- --ci` | Pass; 91.96/83.47/94.23/94.57% |
| `npm run build` | Pass |
| Package JSON/lock Prettier and `git diff --check` | Pass |
| Production HTTP optimizer smoke on local port 3012 | Not verified: server reported Ready, but client loopback requests timed out, including the scoped escalation; the owned server was stopped |

Both production audit comparisons used exactly `npm audit --package-lock-only --omit=dev --json --prefix <isolated baseline-or-candidate>`, with copies of the corresponding manifest/lock. Baseline: **0 critical, 10 high, 2 moderate**. Candidate: **0 critical, 9 high, 2 moderate**. Sharp is the only removed package finding; all three Sharp advisory entries disappear and no findings are added. Full-tree audits include development packages and are not compared with the production-only readiness snapshot.

Local native scripts, audit JSON and check logs remain ignored under `client/test-results/dependency-runtime/`; benign static fixtures are ignored under `client/public/coverage/dependency-runtime/`.

## Remaining scope and limits

PostCSS parses project CSS during build/development; glob/fast-glob serve build discovery and tooling. PostCSS's Nano ID call uses a fixed positive length of six, unlike the reported zero/negative-size triggers. No application request-controlled CSS, glob or Nano ID input path was found. The remaining production audit entries include these tooling dependency paths; retain their maintenance/reachability follow-up in existing #257 rather than forcing a Next 16 or Tailwind 4 migration into #294.

No malicious exploit inputs, live endpoints, deployed native libraries or live storage policies were tested. Linux native compatibility, production HTTP behavior and independent integration review remain gates for the parent/CI. The audit result is not a claim that the entire application is clean or a proof of code execution. No commit, push, merge or deployment occurred in this worktree.
