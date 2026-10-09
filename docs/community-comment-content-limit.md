# Community comment content limit (#292)

Comment bodies are limited to 2,000 Unicode code points in the client and
database. The new validated `comments_body_length_check` applies to inserts and
updates, including roles that bypass RLS. It does not change grants, ownership
policies, attachment rules, or existing content.

## Boundary decisions

| Requirement                     | Decision and evidence                                                                                                                                                                                                                                                                                                          |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Matching character limits       | JavaScript `Array.from(text).length` matches PostgreSQL UTF-8 `char_length(body)`. ASCII, BMP, astral, and combining-mark controls pass at 2,000 and fail at 2,001. Combining marks count separately; the limit does not count grapheme clusters or UTF-8 bytes.                                                               |
| Accessible feedback before work | The composer shows the count, links its error with `aria-describedby`, sets `aria-invalid`, and disables Reply above the limit. Its submit guard also handles a direct submit event. The feed action validates before uploads or local mutations; the service and repository facade validate before writes or legacy fallback. |
| Native textarea limit           | HTML `maxlength` counts UTF-16 code units. The 4,000-unit ceiling accommodates every valid 2,000-code-point string, including 2,000 emoji. The shared validator enforces the semantic 2,000-character limit.                                                                                                                   |
| Existing content contracts      | Database NULL, empty, whitespace-only, and image-only bodies remain allowed. The service retains its empty/image-only contract. The existing composer still requires non-whitespace text and trims accepted submitted text. Validation counts the raw draft first.                                                             |
| No automatic rewriting          | The migration adds a validated CHECK without a backfill or truncation. Existing overlong rows make application fail for review; the migration does not silently rewrite them. Accepted service/repository text is stored unchanged.                                                                                            |

The writer search found one production path:
`CommentForm -> useCommunityFeedActions -> createCommunityComment ->
insertCommunityCommentRow -> current or legacy adapter`. The adapters have no
other production callers. The database constraint also protects direct clients.
UI validation improves feedback; database enforcement remains authoritative.

## Verification on 9 October 2026

Baseline: `3e36a257ca27a522deac6724876a6ca5adc7cb1e`, branch
`fix/292-community-comment-bounds`.

| Check                                               | Actual result                                                                                                                                                                                                                                                   |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Client regression before implementation             | 12 failed, 21 passed across four suites. Service/repository calls accepted oversized bodies; the local feed action mutated state; the form lacked length feedback.                                                                                              |
| Community unit/contract suites after implementation | 47 suites, 252 tests passed. Includes direct service/repository rejection, action rejection before upload or local mutation, Unicode controls, draft/attachment retention, and failed-submit recovery.                                                          |
| Coverage across five changed production modules     | 83.87% lines, 70.68% branches. CommentForm: 81.25% lines / 80.55% branches. Validation: 96.15% lines / 88.88% branches. Remaining broad service/hook branches include existing load, deletion, and save paths; this is scoped coverage, not whole-app coverage. |
| Native PostgreSQL regression before constraint      | 9 of 23 pgTAP checks failed. Oversized authenticated and service-role inserts and service-role updates succeeded. All legitimate Unicode and empty/image-only controls passed.                                                                                  |
| Native PostgreSQL after constraint                  | 23 of 23 transactional pgTAP checks passed; fixtures roll back. Browser UPDATE and anonymous INSERT permissions remain denied. Accepted Unicode text and failed-update originals remain intact.                                                                 |
| Chromium, real local interface with mocked provider | One journey passed: overlong draft and attachment remain visible, accessible error is announced, disabled-button bypass causes no upload/write, and correction to 2,000 emoji posts the full payload and clears the draft.                                      |
| Static/native checks                                | TypeScript `tsc --noEmit`, focused ESLint, Prettier, diff whitespace check, local public-schema lint, and local security advisors passed.                                                                                                                       |

Native SQL verification used only the disposable local project
`fit-readiness-20261009` (PostgreSQL 17.6; API `127.0.0.1:54331`), after the #288
candidate had been installed. Supabase CLI 2.84.2 generated the new migration
filename. `db query --file` rejected a two-statement prepared query with SQLSTATE
42601, so the migration's ALTER and COMMENT were executed separately with
`db query --local`. No migration-history entry was added by that iteration.
This run is incremental verification; a full combined migration replay and
repository-wide checks are separate integration checks. No hosted data was read
or changed during this implementation.

Windows sandbox attempts encountered a Jest cache rename error, a sandbox-local
browser-cache lookup, and an isolated-loopback timeout. A worktree-local Jest
cache and the installed Chromium 1228 resolved the first two; the authorized
loopback test server and browser ran outside that network sandbox for the final
passing journey. No global configuration or sandbox setting was changed.

An initial server launch from the repository root generated incomplete Tailwind
CSS. Its `.next` cache was preserved under `server/.cache/next-incomplete-css/`;
the final browser run used a fresh cache and the normal client working directory.
The feedback screenshot was visually inspected with the correct layout and
styling, and the retained browser test verifies a computed textarea style.

Ignored local evidence is under `server/.cache/`: `comment-bounds-unit-red.log`,
`comment-bounds-community-green.log`, `comment-bounds-database-red.log`,
`comment-bounds-database-green.log`, `comment-bounds-browser.log`,
`comment-bounds-coverage/`, and database lint/advisor logs. These are local
verification artifacts, not deployed-provider evidence.

Primary references: [PostgreSQL 17 string functions](https://www.postgresql.org/docs/17/functions-string.html)
and [HTML textarea maxlength](https://html.spec.whatwg.org/multipage/form-elements.html#attr-textarea-maxlength).
Supabase's current changelog and installed CLI help were checked before local
database work; this change adds no new Supabase client API.
