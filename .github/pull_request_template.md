## Why

Explain the user or maintainer problem and why this change is the right scope.

## What changed

- Summarize behavior and architectural boundaries, not every edited file.
- Call out financial metric/ranking semantics and assumptions when applicable.
- Name any Supabase migration and its intended target environment.

## How it was verified

List the exact commands and manual user journeys that passed.

## UI evidence

For UI changes, add before/after screenshots or a short recording.

| Before | After |
| ------ | ----- |
|        |       |

## Deployment notes

State whether this PR needs environment variables, a database migration, provider configuration or no deployment action.

## Checklist

- [ ] I read [CONTRIBUTING.md](https://github.com/ParasX1/Financial-Investment-Tool/blob/main/CONTRIBUTING.md) or the [中文贡献指南](https://github.com/ParasX1/Financial-Investment-Tool/blob/main/CONTRIBUTING.zh-CN.md).
- [ ] The change lives in the correct feature, shared layer or backend domain.
- [ ] New behavior or a bug fix has a regression test.
- [ ] Financial units, direction and assumptions are explicit and tested.
- [ ] Loading, empty, error and stale states remain usable.
- [ ] Relevant unit, typecheck, lint, build and E2E checks pass.
- [ ] Changed files pass Prettier without unrelated repository-wide formatting.
- [ ] Database changes include reviewed SQL, minimum grants, RLS and contract tests.
- [ ] No secret, service-role key, production data or generated artifact is committed.
- [ ] Documentation changed when paths, behavior or contributor workflow changed.
