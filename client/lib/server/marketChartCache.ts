import {
  getMarketChartRange,
  type MarketChartRangeId,
} from "@/lib/market/chartRanges";
import {
  fetchYahooChartSnapshot,
  type YahooChartSnapshot,
} from "./yahooChartProvider";
import { normalizeYahooMarketSymbol } from "./yahooQuoteProvider";

type YahooChartOptions = NonNullable<
  Parameters<typeof fetchYahooChartSnapshot>[1]
>;

export type MarketChartCacheOptions = YahooChartOptions & {
  now?: () => number;
};

type MarketChartCacheEntry = {
  expiresAt: number;
  snapshot: YahooChartSnapshot;
};

const MAX_CACHE_ENTRIES = 256;
export const MARKET_CHART_MAX_IN_FLIGHT = 64;
const cache = new Map<string, MarketChartCacheEntry>();
const inFlight = new Map<string, Promise<YahooChartSnapshot>>();

const CACHE_TTL_BY_RANGE_MS: Readonly<Record<MarketChartRangeId, number>> = {
  "1d": 15_000,
  "5d": 60_000,
  "1m": 300_000,
  "3m": 900_000,
  "6m": 900_000,
  ytd: 900_000,
  "1y": 900_000,
  "5y": 3_600_000,
  max: 3_600_000,
};

export function getMarketChartCacheTtl(
  rangeId: MarketChartRangeId,
): number {
  return CACHE_TTL_BY_RANGE_MS[rangeId];
}

function removeExpiredEntries(now: number) {
  for (const [key, entry] of Array.from(cache.entries())) {
    if (entry.expiresAt <= now) cache.delete(key);
  }
}

function makeRoom(now: number) {
  removeExpiredEntries(now);
  while (cache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = cache.keys().next().value as string | undefined;
    if (!oldestKey) return;
    cache.delete(oldestKey);
  }
}

export function clearMarketChartCache() {
  cache.clear();
  inFlight.clear();
}

export function fetchCachedYahooChartSnapshot(
  value: string,
  options: MarketChartCacheOptions = {},
): Promise<YahooChartSnapshot> {
  const { now = Date.now, ...providerOptions } = options;
  const symbol = normalizeYahooMarketSymbol(value);
  if (!symbol) {
    return fetchYahooChartSnapshot(value, providerOptions);
  }

  const range = getMarketChartRange(providerOptions.rangeId);
  const cacheKey = `${symbol}:${range.id}`;
  const currentTime = now();
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > currentTime) {
    return Promise.resolve(cached.snapshot);
  }
  if (cached) cache.delete(cacheKey);

  const pending = inFlight.get(cacheKey);
  if (pending) return pending;

  if (inFlight.size >= MARKET_CHART_MAX_IN_FLIGHT) {
    return Promise.reject(
      new Error("Market chart request capacity reached"),
    );
  }

  const request = fetchYahooChartSnapshot(symbol, {
    ...providerOptions,
    rangeId: range.id,
  })
    .then((snapshot) => {
      const completedAt = now();
      makeRoom(completedAt);
      cache.set(cacheKey, {
        expiresAt: completedAt + getMarketChartCacheTtl(range.id),
        snapshot,
      });
      return snapshot;
    })
    .finally(() => {
      if (inFlight.get(cacheKey) === request) inFlight.delete(cacheKey);
    });

  inFlight.set(cacheKey, request);
  return request;
}
