# Frontend workspace

This directory contains the Next.js Pages Router application.

For the full architecture, change-location matrix and contribution workflow, read the [English contributor guide](../CONTRIBUTING.md) or [中文贡献指南](../CONTRIBUTING.zh-CN.md).

## Start

```bash
npm ci
cp .env.example .env.local
npm run dev
```

On PowerShell use `Copy-Item .env.example .env.local`. The app opens at `http://127.0.0.1:3000`.

Portfolio metrics and Top Picks expect Flask at `http://127.0.0.1:8080` by default. Use `NEXT_PUBLIC_API_BASE` only when the backend runs elsewhere.

## Source map

| Path          | Purpose                                                       |
| ------------- | ------------------------------------------------------------- |
| `pages/`      | thin page entrypoints and server-side Next API handlers       |
| `features/`   | product behavior grouped by business capability               |
| `components/` | application-shell and cross-feature UI                        |
| `lib/`        | neutral clients, providers, route builders and infrastructure |
| `assets/`     | source-imported images                                        |
| `public/`     | public-URL files                                              |
| `styles/`     | global style and theme configuration                          |
| `tests/`      | cross-feature contracts and Playwright journeys               |
| `scripts/`    | maintenance scripts                                           |

Page files should import a feature's public `index.ts`. Product logic belongs in the owning feature, not in `pages/`.

## Checks

```bash
npm test -- --runInBand
npm run test:portfolio-top-picks:coverage
npm run test:watchlist:coverage
npx tsc --noEmit --pretty false
npm run lint -- --no-cache
npm run build
npm run test:e2e
```

Check formatting only for files changed by the current work:

```bash
npx prettier --check <changed-file-1> <changed-file-2>
```

Use `npm run clean` to remove generated build, coverage and Playwright artifacts. It intentionally preserves `node_modules/`.

## Environment safety

- Any `NEXT_PUBLIC_` value is delivered to the browser.
- Use only a Supabase publishable key in browser configuration.
- Never expose a secret or service-role key.
- News provider settings in `.env.example` are read by server-side Next API routes.
