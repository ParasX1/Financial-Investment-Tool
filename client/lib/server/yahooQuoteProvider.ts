export interface YahooQuoteSnapshot {
  change: number | null;
  changePercent: number | null;
  currency: string | null;
  exchange: string | null;
  longName: string | null;
  marketState: string | null;
  previousClose: number | null;
  price: number | null;
  quoteTime: string | null;
  shortName: string | null;
  symbol: string;
}

type FetchImplementation = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

type YahooQuoteProviderOptions = {
  clock?: () => number;
  fallbackBatchSize?: number;
  fetchImpl?: FetchImplementation;
  now?: () => number;
  timeoutMs?: number;
};

type JsonRecord = Record<string, unknown>;

const YAHOO_HOST = "https://query1.finance.yahoo.com";
const YAHOO_USER_AGENT = "financial-investment-tool";
const DEFAULT_TIMEOUT_MS = 5_000;
const DEFAULT_FALLBACK_BATCH_SIZE = 5;
const SYMBOL_PATTERN = /^[A-Z0-9^][A-Z0-9.^=_-]{0,19}$/;

export class YahooQuoteProviderError extends Error {
  constructor(
    public readonly code: "invalid-payload" | "network" | "upstream",
    public readonly status: number | null = null,
  ) {
    super("Market data provider unavailable");
    this.name = "YahooQuoteProviderError";
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

function nullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function firstFiniteNumber(...values: readonly unknown[]): number | null {
  for (const value of values) {
    const number = finiteNumber(value);
    if (number !== null) return number;
  }
  return null;
}

function safeIsoTimestamp(value: unknown): string | null {
  const epochSeconds = finiteNumber(value);
  if (epochSeconds === null) return null;
  const date = new Date(epochSeconds * 1_000);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function rounded(value: number): number {
  return Number(value.toFixed(12));
}

function inferMarketState(
  meta: JsonRecord,
  nowEpochSeconds: number,
): string | null {
  const explicitState = nullableString(meta.marketState);
  if (explicitState) return explicitState.toUpperCase();

  const periods = asRecord(meta.currentTradingPeriod);
  if (!periods) return null;

  const candidates = [
    ["pre", "PRE"],
    ["regular", "REGULAR"],
    ["post", "POST"],
  ] as const;
  let hasTradingWindow = false;

  for (const [key, state] of candidates) {
    const period = asRecord(periods[key]);
    const start = finiteNumber(period?.start);
    const end = finiteNumber(period?.end);
    if (start === null || end === null) continue;
    hasTradingWindow = true;
    if (nowEpochSeconds >= start && nowEpochSeconds < end) return state;
  }

  return hasTradingWindow ? "CLOSED" : null;
}

export function normalizeYahooMarketSymbol(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const symbol = value.trim().toUpperCase();
  return SYMBOL_PATTERN.test(symbol) ? symbol : null;
}

export function createUnavailableYahooQuote(symbol: string): YahooQuoteSnapshot {
  return {
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
  };
}

export function mapYahooChartMetaQuote(
  value: unknown,
  requestedSymbol: string,
  nowEpochSeconds = Math.floor(Date.now() / 1_000),
): YahooQuoteSnapshot {
  const meta = asRecord(value) ?? {};
  const symbol =
    normalizeYahooMarketSymbol(requestedSymbol) ??
    requestedSymbol.trim().toUpperCase();
  const providerSymbol = normalizeYahooMarketSymbol(meta.symbol);
  if (meta.symbol != null && providerSymbol !== symbol) {
    throw new YahooQuoteProviderError("invalid-payload", 200);
  }
  const price = firstFiniteNumber(meta.regularMarketPrice);
  const previousClose = firstFiniteNumber(
    meta.chartPreviousClose,
    meta.previousClose,
    meta.regularMarketPreviousClose,
  );
  const providerChange = finiteNumber(meta.regularMarketChange);
  const providerChangePercent = finiteNumber(meta.regularMarketChangePercent);
  const derivedChange =
    price !== null && previousClose !== null
      ? rounded(price - previousClose)
      : null;
  const derivedChangePercent =
    derivedChange !== null && previousClose !== null && previousClose !== 0
      ? (derivedChange / previousClose) * 100
      : null;

  return {
    change: providerChange ?? derivedChange,
    changePercent: providerChangePercent ?? derivedChangePercent,
    currency: nullableString(meta.currency),
    exchange:
      nullableString(meta.fullExchangeName) ?? nullableString(meta.exchangeName),
    longName: nullableString(meta.longName),
    marketState: inferMarketState(meta, nowEpochSeconds),
    previousClose,
    price,
    quoteTime: safeIsoTimestamp(meta.regularMarketTime),
    shortName: nullableString(meta.shortName),
    symbol,
  };
}

function requestInit(timeoutMs: number): RequestInit {
  return {
    headers: {
      Accept: "application/json",
      "User-Agent": YAHOO_USER_AGENT,
    },
    signal: AbortSignal.timeout(timeoutMs),
  };
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new YahooQuoteProviderError("invalid-payload", response.status);
  }
}

async function fetchSparkQuotes(
  symbols: readonly string[],
  fetchImpl: FetchImplementation,
  timeoutMs: number,
  nowEpochSeconds: number,
): Promise<ReadonlyMap<string, YahooQuoteSnapshot>> {
  const url = new URL("/v7/finance/spark", YAHOO_HOST);
  url.searchParams.set("symbols", symbols.join(","));
  url.searchParams.set("range", "1d");
  url.searchParams.set("interval", "1d");

  let response: Response;
  try {
    response = await fetchImpl(url.toString(), requestInit(timeoutMs));
  } catch {
    throw new YahooQuoteProviderError("network");
  }
  if (!response.ok) {
    throw new YahooQuoteProviderError("upstream", response.status);
  }

  const payload = asRecord(await readJson(response));
  const spark = asRecord(payload?.spark);
  if (!spark || !Array.isArray(spark.result) || spark.error) {
    throw new YahooQuoteProviderError("invalid-payload", response.status);
  }

  const quotes = new Map<string, YahooQuoteSnapshot>();
  for (const value of spark.result) {
    const row = asRecord(value);
    const symbol = normalizeYahooMarketSymbol(row?.symbol);
    const responseRow = asRecord(asArray(row?.response)[0]);
    const meta = asRecord(responseRow?.meta);
    if (!symbol || !meta) continue;
    quotes.set(symbol, mapYahooChartMetaQuote(meta, symbol, nowEpochSeconds));
  }
  return quotes;
}

async function fetchChartQuote(
  symbol: string,
  fetchImpl: FetchImplementation,
  timeoutMs: number,
  nowEpochSeconds: number,
): Promise<YahooQuoteSnapshot | null> {
  const url = new URL(
    `/v8/finance/chart/${encodeURIComponent(symbol)}`,
    YAHOO_HOST,
  );
  url.searchParams.set("range", "1d");
  url.searchParams.set("interval", "1d");

  let response: Response;
  try {
    response = await fetchImpl(url.toString(), requestInit(timeoutMs));
  } catch {
    throw new YahooQuoteProviderError("network");
  }
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new YahooQuoteProviderError("upstream", response.status);
  }

  const payload = asRecord(await readJson(response));
  const chart = asRecord(payload?.chart);
  if (!chart) {
    throw new YahooQuoteProviderError("invalid-payload", response.status);
  }
  if (chart.error) return null;
  const result = asRecord(asArray(chart.result)[0]);
  const meta = asRecord(result?.meta);
  return meta ? mapYahooChartMetaQuote(meta, symbol, nowEpochSeconds) : null;
}

async function fetchChartFallback(
  symbols: readonly string[],
  fetchImpl: FetchImplementation,
  deadline: number,
  clock: () => number,
  nowEpochSeconds: number,
  batchSize: number,
) {
  let results: PromiseSettledResult<YahooQuoteSnapshot | null>[] = [];
  for (let start = 0; start < symbols.length; start += batchSize) {
    const remainingMs = Math.floor(deadline - clock());
    if (remainingMs <= 0) break;
    const batch = symbols.slice(start, start + batchSize);
    const settled = await Promise.allSettled(
      batch.map((symbol) =>
        fetchChartQuote(symbol, fetchImpl, remainingMs, nowEpochSeconds),
      ),
    );
    results = [...results, ...settled];
  }
  return results;
}

function supportsChartFallback(error: unknown): boolean {
  if (!(error instanceof YahooQuoteProviderError)) return false;
  return (
    (error.code === "upstream" &&
      (error.status === 401 || error.status === 403)) ||
    (error.code === "invalid-payload" && error.status === 200)
  );
}

export async function fetchYahooQuoteSnapshots(
  values: readonly string[],
  options: YahooQuoteProviderOptions = {},
): Promise<YahooQuoteSnapshot[]> {
  const symbols = values.map(normalizeYahooMarketSymbol);
  if (symbols.some((symbol) => symbol === null)) {
    throw new YahooQuoteProviderError("invalid-payload");
  }
  const normalizedSymbols = symbols as string[];
  if (!normalizedSymbols.length) return [];

  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = Math.max(
    1,
    Math.floor(options.timeoutMs ?? DEFAULT_TIMEOUT_MS),
  );
  const clock = options.clock ?? Date.now;
  const deadline = clock() + timeoutMs;
  const nowEpochSeconds = Math.floor((options.now?.() ?? Date.now()) / 1_000);
  const fallbackBatchSize = Math.max(
    1,
    Math.min(options.fallbackBatchSize ?? DEFAULT_FALLBACK_BATCH_SIZE, 10),
  );

  try {
    const quoteMap = await fetchSparkQuotes(
      normalizedSymbols,
      fetchImpl,
      Math.max(1, Math.ceil(timeoutMs / 2)),
      nowEpochSeconds,
    );
    return normalizedSymbols.map(
      (symbol) => quoteMap.get(symbol) ?? createUnavailableYahooQuote(symbol),
    );
  } catch (error: unknown) {
    if (!supportsChartFallback(error)) throw error;
    const fallbackResults = await fetchChartFallback(
      normalizedSymbols,
      fetchImpl,
      deadline,
      clock,
      nowEpochSeconds,
      fallbackBatchSize,
    );
    if (!fallbackResults.some((result) => result.status === "fulfilled")) {
      throw new YahooQuoteProviderError("upstream");
    }
    return normalizedSymbols.map((symbol, index) => {
      const result = fallbackResults[index];
      return result?.status === "fulfilled" && result.value
        ? result.value
        : createUnavailableYahooQuote(symbol);
    });
  }
}

export function getYahooQuoteProviderLog(error: unknown) {
  return error instanceof YahooQuoteProviderError
    ? { code: error.code, status: error.status }
    : { code: "unknown", status: null };
}
