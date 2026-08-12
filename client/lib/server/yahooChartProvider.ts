import {
  mapYahooChartMetaQuote,
  normalizeYahooMarketSymbol,
} from "./yahooQuoteProvider";
import {
  getMarketChartRange,
  type MarketChartInterval,
  type MarketChartRangeId,
} from "@/lib/market/chartRanges";

export interface MarketChartPoint {
  timeMs: number;
  value: number;
}

export interface YahooChartSnapshot {
  currency: string | null;
  exchange: string | null;
  interval: MarketChartInterval;
  marketState: string | null;
  points: MarketChartPoint[];
  previousClose: number | null;
  quoteTime: string | null;
  rangeId: MarketChartRangeId;
  regularMarketPrice: number | null;
  symbol: string;
}

type FetchImplementation = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

interface YahooChartProviderOptions {
  fetchImpl?: FetchImplementation;
  maxPoints?: number;
  rangeId?: MarketChartRangeId;
  timeoutMs?: number;
}

type JsonRecord = Record<string, unknown>;

const YAHOO_HOST = "https://query1.finance.yahoo.com";
const YAHOO_USER_AGENT = "financial-investment-tool";
const DEFAULT_MAX_POINTS = 240;
const DEFAULT_TIMEOUT_MS = 5_000;

export class YahooChartProviderError extends Error {
  constructor(
    public readonly code:
      | "invalid-payload"
      | "invalid-symbol"
      | "network"
      | "upstream",
    public readonly status: number | null = null,
  ) {
    super("Market chart provider unavailable");
    this.name = "YahooChartProviderError";
  }
}

function asRecord(value: unknown): JsonRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;
}

function asArray(value: unknown): readonly unknown[] {
  return Array.isArray(value) ? value : [];
}

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function compactPoints(
  points: readonly MarketChartPoint[],
  maxPoints: number,
): MarketChartPoint[] {
  if (points.length <= maxPoints) return [...points];
  const step = (points.length - 1) / (maxPoints - 1);
  const indexes = Array.from({ length: maxPoints }, (_, index) =>
    Math.round(index * step),
  );
  return indexes.map((index) => points[index]!).filter(Boolean);
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new YahooChartProviderError("invalid-payload", response.status);
  }
}

export async function fetchYahooChartSnapshot(
  value: string,
  options: YahooChartProviderOptions = {},
): Promise<YahooChartSnapshot> {
  const symbol = normalizeYahooMarketSymbol(value);
  if (!symbol) throw new YahooChartProviderError("invalid-symbol");

  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = Math.max(
    1,
    Math.floor(options.timeoutMs ?? DEFAULT_TIMEOUT_MS),
  );
  const maxPoints = Math.max(
    2,
    Math.min(Math.floor(options.maxPoints ?? DEFAULT_MAX_POINTS), 500),
  );
  const range = getMarketChartRange(options.rangeId);
  const url = new URL(
    `/v8/finance/chart/${encodeURIComponent(symbol)}`,
    YAHOO_HOST,
  );
  url.searchParams.set("range", range.providerRange);
  url.searchParams.set("interval", range.interval);

  let response: Response;
  try {
    response = await fetchImpl(url.toString(), {
      headers: {
        Accept: "application/json",
        "User-Agent": YAHOO_USER_AGENT,
      },
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch {
    throw new YahooChartProviderError("network");
  }
  if (!response.ok) {
    throw new YahooChartProviderError("upstream", response.status);
  }

  const payload = asRecord(await readJson(response));
  const chart = asRecord(payload?.chart);
  const result = asRecord(asArray(chart?.result)[0]);
  const meta = asRecord(result?.meta);
  if (!chart || chart.error || !result || !meta) {
    throw new YahooChartProviderError("invalid-payload", response.status);
  }

  let quoteMeta;
  try {
    quoteMeta = mapYahooChartMetaQuote(meta, symbol);
  } catch {
    throw new YahooChartProviderError("invalid-payload", response.status);
  }

  const timestamps = asArray(result.timestamp);
  const indicators = asRecord(result.indicators);
  const quote = asRecord(asArray(indicators?.quote)[0]);
  const closes = asArray(quote?.close);
  const points: MarketChartPoint[] = [];

  for (
    let index = 0;
    index < Math.min(timestamps.length, closes.length);
    index += 1
  ) {
    const timestamp = finiteNumber(timestamps[index]);
    const close = finiteNumber(closes[index]);
    if (timestamp === null || close === null) continue;
    points.push({ timeMs: timestamp * 1_000, value: close });
  }

  return {
    currency: quoteMeta.currency,
    exchange: quoteMeta.exchange,
    interval: range.interval,
    marketState: quoteMeta.marketState,
    points: compactPoints(points, maxPoints),
    previousClose: quoteMeta.previousClose,
    quoteTime: quoteMeta.quoteTime,
    rangeId: range.id,
    regularMarketPrice: quoteMeta.price,
    symbol,
  };
}

export function getYahooChartProviderLog(error: unknown) {
  return error instanceof YahooChartProviderError
    ? { code: error.code, status: error.status }
    : { code: "unknown", status: null };
}
