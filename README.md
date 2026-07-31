# Financial-Investment-Tool

[![Frontend CI](https://github.com/ParasX1/Financial-Investment-Tool/actions/workflows/node.js.yml/badge.svg)](https://github.com/ParasX1/Financial-Investment-Tool/actions/workflows/node.js.yml)
[![Backend CI](https://github.com/ParasX1/Financial-Investment-Tool/actions/workflows/python-app.yml/badge.svg)](https://github.com/ParasX1/Financial-Investment-Tool/actions/workflows/python-app.yml)

Financial-Investment-Tool is a research workspace for traders and investors. It combines a multi-chart Portfolio workspace, server-ranked Top Picks, Watchlist research, Market News, and community/account workflows in one monorepo.

## Product surfaces

- **Portfolio:** compare financial metrics in Board mode, inspect one chart in Focus mode, or arrange many independent windows in Observation mode.
- **Top Picks:** inspect a server-authoritative ranked universe with explicit metric semantics, sorting, pagination, and saved table preferences.
- **Watchlist:** maintain a research queue and compare symbols, quotes, and market context.
- **Market News:** filter, search, paginate, and deep-link to market, regional, industry, commodity, and ticker news.
- **Community and profile:** publish research, discuss ideas, and manage authenticated account data.

## Architecture

| Layer            | Path        | Responsibility                                                                           |
| ---------------- | ----------- | ---------------------------------------------------------------------------------------- |
| Next.js frontend | `client/`   | Pages Router entrypoints, feature UI, browser state, Next API routes, and frontend tests |
| Flask backend    | `server/`   | portfolio analytics, market-data endpoints, Top Picks ranking, and backend tests         |
| Supabase         | `supabase/` | versioned schema, grants, RLS policies, storage policies, and local seed data            |

The main dependency direction is:

```text
client/pages -> client/features -> client/components or client/lib
client/features -> client/pages/api, Flask API, or Supabase
server/src/routes -> analytics or domain services -> repositories/calculators
supabase/migrations -> Postgres schema and authorization
```

For a folder-by-folder map, debugging routes, and guidance on where to add code, read the [English contributor guide](CONTRIBUTING.md) or [中文贡献指南](CONTRIBUTING.zh-CN.md).

## Quick start

Prerequisites:

- Node.js 22 or newer
- Python 3.10 or newer
- Docker Desktop and the Supabase CLI only when working on local authenticated database flows or migrations

### Frontend

```bash
cd client
npm ci
cp .env.example .env.local
npm run dev
```

On PowerShell, use `Copy-Item .env.example .env.local`. The app opens at `http://127.0.0.1:3000`.

Only browser-safe Supabase values may use the `NEXT_PUBLIC_` prefix. News provider configuration remains server-side in Next API routes.

### Backend

Portfolio metrics and Top Picks expect the Flask API at `http://127.0.0.1:8080` by default. In a second terminal from the repository root:

```bash
cd server
python -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements-dev.txt
python -m src.server
```

On PowerShell, activate with `.\.venv\Scripts\Activate.ps1` instead of the `source` command.

The backend can start without Supabase configuration. Endpoints that require it return a configuration error until `SUPABASE_URL` and `SUPABASE_KEY` are provided.

### Supabase

Unit tests and mocked Playwright journeys do not require a live database. For local schema or authenticated integration work:

```bash
supabase start
supabase db reset
```

`supabase db reset` rebuilds the local database and is destructive to local data. Remote migration deployment is a separate, authorized maintainer action; a migration committed to a branch is not automatically pushed.

## Common checks

Frontend, from `client/`:

```bash
npm test -- --runInBand
npm run test:portfolio-top-picks:coverage
npm run test:watchlist:coverage
npx tsc --noEmit --pretty false
npm run lint -- --no-cache
npm run build
npm run test:e2e
```

Backend, from `server/`:

```bash
python -m pytest -q
python -m compileall -q src tests
python -m flake8 src tests --count --select=E9,F63,F7,F82 --show-source --statistics
```

## Contributing

Start with:

- [CONTRIBUTING.md](CONTRIBUTING.md) — canonical English repository map and workflow
- [CONTRIBUTING.zh-CN.md](CONTRIBUTING.zh-CN.md) — 中文代码结构与贡献指南
- [client/README.md](client/README.md) — concise frontend workspace commands

Keep product code in its owning feature, promote code to a shared layer only after it has a genuinely feature-neutral contract, and include tests for behavioral or architectural boundaries.

## License

This project is licensed under the [GNU General Public License v3.0](LICENSE).
