import type { Page, Request, Route } from "@playwright/test";

export type TopPicksRequest = Readonly<{
  page: number;
  page_size: number;
  sort_key:
    | "ret1y"
    | "sharpe"
    | "sortino"
    | "volatility"
    | "maxDD"
    | "beta"
    | "alpha"
    | "infoRatio";
  sort_dir: "asc" | "desc";
}>;

type MockTopPick = Readonly<{
  symbol: string;
  name: string;
  industry: string;
  ret1y: number | null;
  sharpe: number | null;
  sortino: number | null;
  volatility: number | null;
  maxDD: number | null;
  beta: number | null;
  alpha: number | null;
  infoRatio: number | null;
  metricStatus?: Readonly<Record<string, string>>;
}>;

const responseHeaders = {
  "access-control-allow-headers":
    "apikey, authorization, content-type, x-client-info",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-origin": "*",
  "content-type": "application/json",
};

const namedRows: Readonly<Record<string, MockTopPick>> = {
  "CBA.AX": {
    symbol: "CBA.AX",
    name: "Commonwealth Bank of Australia",
    industry: "Banks",
    ret1y: 0.18,
    sharpe: 1.41,
    sortino: null,
    volatility: 0.2,
    maxDD: -0.11,
    beta: 0.94,
    alpha: 0.5,
    infoRatio: 0.72,
    metricStatus: { alpha: "unavailable", sortino: "infinite" },
  },
  "BHP.AX": {
    symbol: "BHP.AX",
    name: "BHP Group",
    industry: "Materials",
    ret1y: 0.51,
    sharpe: 0.64,
    sortino: 0.91,
    volatility: 0.27,
    maxDD: -0.19,
    beta: 1.08,
    alpha: -0.03,
    infoRatio: -0.14,
    metricStatus: { ret1y: "limited_data" },
  },
  "WES.AX": {
    symbol: "WES.AX",
    name: "Wesfarmers",
    industry: "Consumer Discretionary",
    ret1y: 0.24,
    sharpe: 1.08,
    sortino: 1.57,
    volatility: 0.17,
    maxDD: -0.08,
    beta: 0.82,
    alpha: 0.05,
    infoRatio: 0.61,
  },
};

const fillerRows: readonly MockTopPick[] = Array.from(
  { length: 24 },
  (_, index) => {
    const ordinal = index + 1;
    const suffix = String(ordinal).padStart(2, "0");

    return {
      symbol: `MOCK${suffix}.AX`,
      name: `Mock Company ${suffix}`,
      industry: "Diversified",
      ret1y: 0.12 - ordinal * 0.002,
      sharpe: 0.95 - ordinal * 0.01,
      sortino: 1.2 - ordinal * 0.01,
      volatility: 0.16 + ordinal * 0.001,
      maxDD: -0.07 - ordinal * 0.001,
      beta: 0.8 + ordinal * 0.005,
      alpha: 0.04 - ordinal * 0.001,
      infoRatio: 0.55 - ordinal * 0.01,
    };
  },
);

const defaultServerRanking: readonly MockTopPick[] = [
  namedRows["CBA.AX"],
  namedRows["BHP.AX"],
  namedRows["WES.AX"],
  ...fillerRows,
];

const returnServerRanking: readonly MockTopPick[] = [
  namedRows["WES.AX"],
  namedRows["CBA.AX"],
  namedRows["BHP.AX"],
  ...fillerRows,
];

const sortKeys = new Set<TopPicksRequest["sort_key"]>([
  "ret1y",
  "sharpe",
  "sortino",
  "volatility",
  "maxDD",
  "beta",
  "alpha",
  "infoRatio",
]);

const pageSizes = new Set([10, 25, 50, 100]);

const reverseCopy = <T>(values: readonly T[]): T[] =>
  values.map((_, index) => values[values.length - index - 1]);

const fulfillJson = async (route: Route, body: unknown, status = 200) => {
  await route.fulfill({
    body: JSON.stringify(body),
    headers: responseHeaders,
    status,
  });
};

const parseRequest = (request: Request): TopPicksRequest | null => {
  let value: unknown;
  try {
    value = request.postDataJSON();
  } catch {
    return null;
  }

  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }

  const candidate = value as Partial<TopPicksRequest>;
  if (
    !Number.isInteger(candidate.page) ||
    Number(candidate.page) < 1 ||
    !Number.isInteger(candidate.page_size) ||
    !pageSizes.has(Number(candidate.page_size)) ||
    !sortKeys.has(candidate.sort_key as TopPicksRequest["sort_key"]) ||
    (candidate.sort_dir !== "asc" && candidate.sort_dir !== "desc")
  ) {
    return null;
  }

  return {
    page: Number(candidate.page),
    page_size: Number(candidate.page_size),
    sort_key: candidate.sort_key as TopPicksRequest["sort_key"],
    sort_dir: candidate.sort_dir,
  };
};

export async function installTopPicksMockBackend(page: Page) {
  let requests: readonly TopPicksRequest[] = [];
  let supabaseRequests: readonly string[] = [];

  await page.route("**/api/top-picks", async (route) => {
    if (route.request().method() === "OPTIONS") {
      await route.fulfill({ headers: responseHeaders, status: 204 });
      return;
    }

    if (route.request().method() !== "POST") {
      await fulfillJson(route, { error: "Method not allowed." }, 405);
      return;
    }

    const request = parseRequest(route.request());
    if (!request) {
      await fulfillJson(route, { error: "Invalid Top Picks request." }, 400);
      return;
    }

    requests = [...requests, request];
    const baseRanking =
      request.sort_key === "ret1y" ? returnServerRanking : defaultServerRanking;
    const rankedRows =
      request.sort_dir === "desc" ? [...baseRanking] : reverseCopy(baseRanking);
    const startIndex = (request.page - 1) * request.page_size;
    const rows = rankedRows.slice(startIndex, startIndex + request.page_size);

    await fulfillJson(route, {
      data: { rows, total: rankedRows.length },
      metadata: {
        annualisationDays: 252,
        availableCount: rankedRows.length,
        benchmark: "^AXJO",
        generatedAt: "2026-07-30T06:00:00Z",
        minimumTrailingReturnObservations: 200,
        requestedEnd: "2026-07-30",
        requestedStart: "2025-07-30",
        riskFreeRate: 0.0435,
        riskFreeRateAsOf: "2026-06-17",
        riskFreeRateSource: "RBA cash rate target",
        universeCount: rankedRows.length,
        universeLimit: 50,
        window: "trailing_one_year",
      },
      warnings: [],
    });
  });

  await page.route(
    /^(?:https:\/\/[^/]+\.supabase\.co|http:\/\/(?:localhost|127\.0\.0\.1):54321)\//,
    async (route) => {
      supabaseRequests = [...supabaseRequests, route.request().url()];
      if (route.request().method() === "OPTIONS") {
        await route.fulfill({ headers: responseHeaders, status: 204 });
        return;
      }
      await fulfillJson(route, {});
    },
  );

  return {
    requests: (): readonly TopPicksRequest[] =>
      requests.map((request) => ({ ...request })),
    supabaseRequests: (): readonly string[] => [...supabaseRequests],
  };
}
