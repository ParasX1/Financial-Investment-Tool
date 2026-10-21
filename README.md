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

For a folder-by-folder map, debugging routes, and guidance on where to add code, read the [contributor guide](CONTRIBUTING.md).

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
cp .env.example .env
python -m src.server
```

On PowerShell, activate with `.\.venv\Scripts\Activate.ps1` and create the
configuration file with `Copy-Item .env.example .env`.

The local runner loads `server/.env` before creating the Flask app. Replace its
placeholders with the same Supabase project URL and browser-safe publishable key
used by the frontend. Process environment values take precedence. The backend
can still start without Supabase configuration, but endpoints that require it
return a configuration error.

### Start both services and choose universe sync

After installing the client and server dependencies, activate the server's Python
environment and run `npm run dev` from the repository root. `npm run dev:all` is
an alias. Both commands start Flask and Next without syncing the Top Picks
universe.

For the external-env workflow, run `npm run dev:env` on Windows or
`npm run dev:env:mac` on macOS. These wrappers load `.env` and `.env.local` from
the sibling `Financial-Investment-Tool-env` folder, then start both services with
`--with-universe-sync`. Override that folder with
`npm run dev:env -- -EnvDir "D:\Their\Secret\Folder"` or
`npm run dev:env:mac -- --env-dir "/Users/their/Secret/Folder"`.

This mode prints the project link and schedules ASX200 sync after 60 seconds and
SP500 sync after 90 seconds. It writes to the configured Supabase project using
the server environment. Set `TOP_PICKS_DEV_SYNC_ASX200=false` or
`TOP_PICKS_DEV_SYNC_SP500=false` to disable a job; change their delays with
`TOP_PICKS_DEV_SYNC_DELAY_MS` and `TOP_PICKS_DEV_SYNC_SP500_DELAY_MS`. These
settings apply only in this mode, which can also be selected directly with
`npm run dev -- --with-universe-sync`. A background sync failure leaves Flask
and Next running.

To run a sync immediately as a separate command against the configured Supabase
project:

```bash
npm run sync:top-picks -- --preset ASX200
npm run sync:top-picks -- --preset SP500
```

Add `--dry-run` to prepare records without database writes; presets can still
download public index data. Other arguments supported by
`scripts/sync_top_picks_universe.py` are forwarded unchanged. A failed explicit
sync exits with a nonzero status.

The root runner loads `server/.env` only for Flask and sync children.
Inherited process values override those file defaults; the runner sets
`PYTHONPATH` to `server/`. `FINANCE_DEV_SERVER_PYTHON` selects an executable.
Without an override, `--with-universe-sync` looks for the `financeDev-server`
Conda environment through Conda and common user installation locations, then
falls back to `python`; ordinary startup uses the active environment's `python`.
Next receives the inherited environment with server `SUPABASE_*` settings
removed and loads its own
`client/.env.local`. Keep backend secrets in `server/.env`, and never give them a
`NEXT_PUBLIC_` prefix. The runner does not print environment values and redacts
configured key/token/password values from forwarded output.

On Ctrl+C or a service failure, the runner cancels pending sync timers, stops its
direct children including running sync jobs, waits for their output to close,
and sends a force-kill after five seconds if needed.
Node's child kill does not guarantee termination of descendants created by npm,
shells, or a Python reloader; check those processes if a port remains occupied.
Run `npm run test:dev` for the isolated startup/lifecycle regression tests.

Top Picks includes `data/top-picks-seed.zip` with initial market history and
calculated snapshots. Missing default runtime caches are initialized from this
package, so saved results can appear while current prices update. Existing
caches are preserved, and runtime files under `server/.cache/` remain Git-ignored.

While any app page is open, a shared Top Picks event subscription keeps the
backend updating all ranking windows continuously. Returning to Top Picks reads
the latest saved snapshot. See the consolidated
[Top Picks Sprint Review](docs/top-picks-sprint-review-2026-10-07.md)
for download and cache behavior, merge repairs, subscription lifecycle, seed
import/export, configuration switches, performance measurements, and validation.

To export manually, including from custom caches, run from the repository root:

```bash
python scripts/export_top_picks_seed.py
```

The command also accepts `--snapshot`, `--history`, and `--output`. Exporting does
not download prices or commit the package; submit it through your normal Git
workflow. Ongoing updates without visitors require a separate scheduler.

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
- [client/README.md](client/README.md) — concise frontend workspace commands

Keep product code in its owning feature, promote code to a shared layer only after it has a genuinely feature-neutral contract, and include tests for behavioral or architectural boundaries.

## License

This project is licensed under the [GNU General Public License v3.0](LICENSE).
