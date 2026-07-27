import type { Page, Route } from "@playwright/test";

const PROJECT_URL = "https://watchlist-e2e.supabase.co";
const TEST_USER_ID = "11111111-1111-4111-8111-111111111111";

type WatchlistRow = {
  created_at: string;
  note: string | null;
  position: number;
  symbol: string;
  target_price: number | null;
  updated_at: string;
  user_id: string;
};

const jsonHeaders = {
  "access-control-allow-headers":
    "authorization,apikey,content-type,prefer,x-client-info",
  "access-control-allow-methods": "GET,POST,PATCH,DELETE,OPTIONS",
  "access-control-allow-origin": "*",
  "access-control-expose-headers": "content-range",
  "content-type": "application/json",
};

async function fulfillJson(route: Route, body: unknown, status = 200) {
  await route.fulfill({
    body: JSON.stringify(body),
    headers: jsonHeaders,
    status,
  });
}

function createRow(symbol: string, position: number): WatchlistRow {
  const timestamp = "2026-07-15T00:00:00.000Z";
  return {
    created_at: timestamp,
    note: null,
    position,
    symbol,
    target_price: null,
    updated_at: timestamp,
    user_id: TEST_USER_ID,
  };
}

export async function installWatchlistMockBackend(
  page: Page,
  options: { unavailableSymbols?: readonly string[] } = {},
) {
  let rows = [createRow("CBA.AX", 0), createRow("BHP.AX", 1)];
  const timestamp = "2026-07-15T00:00:00.000Z";
  const unavailableSymbols = new Set(options.unavailableSymbols ?? []);
  const chartRequests: Array<{ range: string; symbols: string[] }> = [];

  await page.addInitScript(
    ({ now, userId }) => {
      window.localStorage.setItem(
        "sb-watchlist-e2e-auth-token",
        JSON.stringify({
          access_token: "watchlist-e2e-access-token",
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          expires_in: 3600,
          refresh_token: "watchlist-e2e-refresh-token",
          token_type: "bearer",
          user: {
            app_metadata: { provider: "email", providers: ["email"] },
            aud: "authenticated",
            confirmed_at: now,
            created_at: now,
            email: "watchlist-e2e@example.test",
            email_confirmed_at: now,
            id: userId,
            identities: [],
            is_anonymous: false,
            last_sign_in_at: now,
            phone: "",
            role: "authenticated",
            updated_at: now,
            user_metadata: {},
          },
        }),
      );
    },
    { now: timestamp, userId: TEST_USER_ID },
  );

  await page.route(`${PROJECT_URL}/rest/v1/**`, async (route) => {
    const request = route.request();
    const method = request.method();
    const url = new URL(request.url());

    if (method === "OPTIONS") {
      await route.fulfill({ headers: jsonHeaders, status: 204 });
      return;
    }

    if (url.pathname.endsWith("/rpc/reorder_watchlist")) {
      const body = request.postDataJSON() as { ordered_symbols: string[] };
      rows = body.ordered_symbols.map((symbol, position) => {
        const existing = rows.find((row) => row.symbol === symbol);
        if (!existing)
          throw new Error(`Unknown mock Watchlist symbol: ${symbol}`);
        return { ...existing, position };
      });
      await fulfillJson(route, null);
      return;
    }

    if (url.pathname.endsWith("/rpc/remove_watchlist_item")) {
      const body = request.postDataJSON() as { item_symbol: string };
      rows = rows
        .filter((row) => row.symbol !== body.item_symbol)
        .map((row, position) => ({ ...row, position }));
      await fulfillJson(route, null);
      return;
    }

    if (!url.pathname.endsWith("/user_watchlist")) {
      await fulfillJson(
        route,
        { message: "Unexpected mock database route." },
        404,
      );
      return;
    }

    if (method === "GET") {
      await fulfillJson(
        route,
        [...rows].sort((a, b) => a.position - b.position),
      );
      return;
    }

    if (method === "POST") {
      const body = request.postDataJSON() as {
        note: string | null;
        position: number;
        symbol: string;
        target_price: number | null;
        user_id: string;
      };
      const created = {
        ...createRow(body.symbol, body.position),
        note: body.note,
        target_price: body.target_price,
        user_id: body.user_id,
      };
      rows = [...rows, created];
      await fulfillJson(route, created, 201);
      return;
    }

    if (method === "PATCH") {
      const symbol = (url.searchParams.get("symbol") ?? "").replace(
        /^eq\./,
        "",
      );
      const body = request.postDataJSON() as {
        note?: string | null;
        target_price?: number | null;
      };
      let updated: WatchlistRow | null = null;
      rows = rows.map((row) => {
        if (row.symbol !== symbol) return row;
        updated = {
          ...row,
          ...(Object.prototype.hasOwnProperty.call(body, "note")
            ? { note: body.note ?? null }
            : {}),
          ...(Object.prototype.hasOwnProperty.call(body, "target_price")
            ? { target_price: body.target_price ?? null }
            : {}),
          updated_at: "2026-07-15T00:05:00.000Z",
        };
        return updated;
      });
      await fulfillJson(route, updated);
      return;
    }

    await fulfillJson(
      route,
      { message: "Unexpected mock database method." },
      405,
    );
  });

  await page.route("**/api/market/symbol-search?*", async (route) => {
    await fulfillJson(route, {
      results: [
        {
          exchange: "ASX",
          name: "Wesfarmers Limited",
          quoteType: "EQUITY",
          symbol: "WES.AX",
        },
      ],
    });
  });

  await page.route("**/api/market/quotes?*", async (route) => {
    const symbols =
      new URL(route.request().url()).searchParams.get("symbols")?.split(",") ??
      [];
    await fulfillJson(route, {
      quotes: symbols.map((symbol) =>
        unavailableSymbols.has(symbol)
          ? {
              change: null,
              changePercent: null,
              currency: null,
              exchange: null,
              longName: null,
              marketState: null,
              previousClose: null,
              price: null,
              quoteTime: null,
              shortName: null,
              symbol,
            }
          : {
              change: 1.2,
              changePercent: 1,
              currency: "AUD",
              exchange: "ASX",
              longName: `${symbol} Company`,
              marketState: "CLOSED",
              previousClose: 119,
              price: 120.2,
              quoteTime: "2026-07-15T04:00:00.000Z",
              shortName: null,
              symbol,
            },
      ),
      unavailableSymbols: symbols.filter((symbol) =>
        unavailableSymbols.has(symbol),
      ),
    });
  });

  await page.route("**/api/market/charts?*", async (route) => {
    const url = new URL(route.request().url());
    const range = url.searchParams.get("range") ?? "1d";
    const symbols = url.searchParams.get("symbols")?.split(",") ?? [];
    const intervalByRange: Record<string, string> = {
      "1d": "1m",
      "5d": "15m",
      "1m": "1h",
      "3m": "1d",
      "6m": "1d",
      ytd: "1d",
      "1y": "1d",
      "5y": "1wk",
      max: "1mo",
    };
    chartRequests.push({ range, symbols: [...symbols] });

    await fulfillJson(route, {
      rangeId: range,
      snapshots: symbols
        .filter((symbol) => !unavailableSymbols.has(symbol))
        .map((symbol, index) => {
          const baseline = index === 0 ? 100 : 50;
          return {
            currency: "AUD",
            exchange: "ASX",
            interval: intervalByRange[range] ?? "1m",
            marketState: "CLOSED",
            points: [
              { timeMs: Date.UTC(2026, 4, 1), value: baseline },
              { timeMs: Date.UTC(2026, 5, 1), value: baseline * 1.04 },
              { timeMs: Date.UTC(2026, 6, 15), value: baseline * (index ? 0.98 : 1.08) },
            ],
            previousClose: baseline,
            quoteTime: "2026-07-15T04:00:00.000Z",
            rangeId: range,
            regularMarketPrice: baseline * (index ? 0.98 : 1.08),
            symbol,
          };
        }),
      unavailableSymbols: symbols.filter((symbol) =>
        unavailableSymbols.has(symbol),
      ),
    });
  });

  return {
    chartRequests: () =>
      chartRequests.map((request) => ({
        range: request.range,
        symbols: [...request.symbols],
      })),
    rows: () => rows.map((row) => ({ ...row })),
  };
}
