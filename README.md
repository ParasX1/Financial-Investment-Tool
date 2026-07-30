# Financial-Investment-Tool
[![Frontend CI](https://github.com/ParasX1/Financial-Investment-Tool/actions/workflows/node.js.yml/badge.svg)](https://github.com/ParasX1/Financial-Investment-Tool/actions/workflows/node.js.yml)
[![Backend CI](https://github.com/ParasX1/Financial-Investment-Tool/actions/workflows/python-app.yml/badge.svg)](https://github.com/ParasX1/Financial-Investment-Tool/actions/workflows/python-app.yml)

The Financial Investment Tool is a web-based platform for investors and portfolio managers. It allows users to analyze stock data, calculate performance metrics, and optimize portfolios. Key features include performance metrics, correlation analysis, and machine learning for predictive analytics, all with an intuitive interface.

## Getting Started
We use a monorepo to hold both our frontend and backend code.

**Frontend**

We use npm and nextjs to run our friend. In the `client` folder, use

```
npm install
```

to install/update project dependencies and

```
npm run dev
```

to compile and host the frontend locally.

1. Copy `client/.env.example` to `client/.env.local`.
2. Add the browser-safe Supabase values and any server-only news API keys.
3. Run `npm run dev`.

Use `client/assets` for images imported by source files. Reserve
`client/public/assets` for files that must be addressed by a public URL; do
not keep duplicate copies unless both access modes are active.

**Backend**

We use flask to run our backend.
Use `server/.env.example` as the configuration checklist and provide its
values through your shell or deployment environment. Then, in the `server`
folder, install the backend development dependencies and run the app:

```
python -m pip install -r requirements-dev.txt
python -m src.server
```

The backend can start without Supabase configuration. Routes that need
Supabase return a configuration error until those values are provided.
Exploratory analysis notebooks live in `server/notebooks`; they are not part
of the Flask runtime source.

## Testing

### Mocking the supabase instance
The supabase instance needs to be run locally to run the API tests. This prevents us from 
going over our usage limits for basically no reason.

Install the supabase CLI [as per the docs.](https://supabase.com/docs/guides/cli/getting-started?queryGroups=platform&platform=linux). 

Install [Docker Desktop](https://docs.docker.com/desktop/)

From the project root run

```
supabase start
```
On first run, this installs all the dependencies (which takes some time).

Pull from the remote database with 

```
superbase db pull
```

The database password is in the discord.

### Testing the backend API
The tests rely on the local superbase database, currently there is no automated way of inserting test data into the
database. This needs to be done by hand.

Additionally, there is no configuration for running the local database on the CI, tests come with the boolean `RUNNING_CI`
to determine whether to skip tests that rely on the local database. At this stage, it is more effort than its worth to
run the supabase instance as a task and we will opt for local testing instead.
