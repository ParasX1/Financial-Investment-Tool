import type { Page, Route } from "@playwright/test";

const jsonHeaders = {
  "access-control-allow-origin": "*",
  "content-type": "application/json",
};

async function fulfillJson(route: Route, body: unknown, status = 200) {
  await route.fulfill({
    body: JSON.stringify(body),
    headers: jsonHeaders,
    status,
  });
}

function topicLabel(topicId: string) {
  const labels: Record<string, string> = {
    "australian-markets": "Australian Markets",
    "companies-earnings": "Companies & Earnings",
    "cost-of-living": "Cost of Living",
    "economy-work": "Economy & Work Overview",
    "economy-policy": "Economy & Policy",
    "international-markets": "Global Markets",
    money: "Money Overview",
    "personal-finance": "Personal Finance",
    "property-news": "Property & Housing",
    "rates-inflation": "Rates & Inflation",
    "super-tax": "Super & Tax",
    technology: "Tech & AI",
    "top-stories": "Top Stories",
    work: "Work & Wages",
  };

  return labels[topicId] ?? "Market News";
}

export async function installMarketNewsMockBackend(page: Page) {
  await page.route("**/api/news/market?*", async (route) => {
    const url = new URL(route.request().url());
    const cursor = url.searchParams.get("cursor");
    const topicId = url.searchParams.get("topicId") ?? "top-stories";
    const overlapContinuation =
      topicId === "property-news" && cursor === "cursor-1";
    const validCursor =
      cursor === null ||
      cursor === "cursor-1" ||
      (topicId === "property-news" && cursor === "cursor-2");
    if (!validCursor) {
      await fulfillJson(route, { error: "Invalid cursor." }, 400);
      return;
    }
    const pageSize = Math.max(
      1,
      Math.min(100, Number(url.searchParams.get("pageSize")) || 13),
    );
    const label = topicLabel(topicId);
    const startIndex = overlapContinuation ? 60 : cursor ? 72 : 0;
    const batchSize = overlapContinuation
      ? 12
      : cursor
        ? 24
        : Math.min(pageSize, 72);
    const articles = Array.from({ length: batchSize }, (_, index) => {
      const articleNumber = startIndex + index + 1;

      return {
        confidence: 0.72,
        id: `${topicId}-${articleNumber}`,
        image: null,
        provider: "google-news-rss",
        providerLabel: "Google News RSS",
        publishedAt: new Date(
          Date.UTC(2026, 6, 24, 4) - (articleNumber - 1) * 60 * 60 * 1000,
        ).toISOString(),
        relatedSymbols: articleNumber % 3 === 1 ? ["CBA.AX"] : [],
        sentiment: "neutral",
        source: "Market News E2E",
        summary: `${label} coverage for usability testing.`,
        title: `${label} story ${articleNumber}`,
        url: `https://example.com/${topicId}/${articleNumber}`,
      };
    });

    await fulfillJson(route, {
      articles,
      meta: {
        attemptedProviders: ["google-news-rss"],
        hasMore: !cursor || overlapContinuation,
        nextCursor: !cursor
          ? "cursor-1"
          : overlapContinuation
            ? "cursor-2"
            : null,
        provider: "google-news-rss",
        providerLabel: "Google News RSS",
        query: label,
        strictCategory: true,
        warnings: [],
      },
    });
  });

  await page.route("**/api/market/ticker-strip?*", async (route) => {
    const scopeId =
      new URL(route.request().url()).searchParams.get("scope") ?? "australia";

    await fulfillJson(route, {
      providerLabel: "E2E quotes",
      refreshMs: 60_000,
      scopeId,
      source: "fallback",
      strategy: "core-plus-dynamic-movers",
      tickers: [],
      updatedAt: null,
      warnings: [],
    });
  });

  await page.route("**/api/market/quotes?*", async (route) => {
    const symbols =
      new URL(route.request().url()).searchParams.get("symbols")?.split(",") ??
      [];

    await fulfillJson(route, {
      quotes: symbols.map((symbol) => ({
        change: 1.2,
        changePercent: 1,
        currency: "AUD",
        exchange: "ASX",
        longName: `${symbol} Company`,
        marketState: "CLOSED",
        previousClose: 119,
        price: 120.2,
        quoteTime: "2026-07-24T04:00:00.000Z",
        shortName: null,
        symbol,
      })),
      unavailableSymbols: [],
    });
  });

  await page.route("**/api/market/sparkline?*", async (route) => {
    const symbol =
      new URL(route.request().url()).searchParams.get("symbol") ?? "^AORD";

    await fulfillJson(route, {
      points: [
        { t: Date.UTC(2026, 6, 24, 2), v: 119 },
        { t: Date.UTC(2026, 6, 24, 4), v: 120.2 },
      ],
      previousClose: 119,
      regularMarketPrice: 120.2,
      symbol,
    });
  });
}
