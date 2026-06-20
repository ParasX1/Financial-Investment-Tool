import type { MarketNewsMarketScope, MarketNewsTicker } from "../types";

export type MarketNewsTickerSignal = NonNullable<MarketNewsTicker["signal"]>;

export interface SelectedMarketNewsTicker {
  symbol: string;
  signal: MarketNewsTickerSignal;
}

function normalizeSymbol(symbol: string) {
  return symbol.trim().toUpperCase();
}

function hasSymbol(symbols: ReadonlySet<string>, symbol: string) {
  return symbols.has(normalizeSymbol(symbol));
}

function uniqueSymbols(symbols: readonly string[]) {
  const seen = new Set<string>();
  const unique: string[] = [];

  symbols.forEach((symbol) => {
    const normalized = normalizeSymbol(symbol);
    if (!normalized || seen.has(normalized)) return;

    seen.add(normalized);
    unique.push(normalized);
  });

  return unique;
}

function fallbackSelection(marketScope: MarketNewsMarketScope) {
  const symbols = marketScope.tickers.map((ticker) => ticker.symbol);
  const coreSymbols = symbols.slice(0, Math.min(3, symbols.length));

  return {
    coreSymbols,
    dynamicSymbols: symbols.slice(coreSymbols.length),
    macroSymbols: [],
    maxTickers: Math.max(1, symbols.length),
  };
}

export function selectMarketNewsTickerSymbols({
  marketScope,
  trendingSymbols = [],
  watchlistSymbols = [],
}: {
  marketScope: MarketNewsMarketScope;
  trendingSymbols?: readonly string[];
  watchlistSymbols?: readonly string[];
}): SelectedMarketNewsTicker[] {
  const selection = marketScope.tickerSelection ?? fallbackSelection(marketScope);
  const maxTickers = Math.max(1, selection.maxTickers);
  const coreSymbols = uniqueSymbols(selection.coreSymbols);
  const macroSymbols = uniqueSymbols(selection.macroSymbols);
  const macroSlots = Math.min(
    macroSymbols.length,
    Math.max(0, Math.ceil(maxTickers / 3)),
  );
  const selected: SelectedMarketNewsTicker[] = [];
  const selectedSymbols = new Set<string>();

  function add(symbol: string, signal: MarketNewsTickerSignal) {
    const normalized = normalizeSymbol(symbol);
    if (!normalized || selectedSymbols.has(normalized)) return;
    if (selected.length >= maxTickers) return;

    selectedSymbols.add(normalized);
    selected.push({ signal, symbol: normalized });
  }

  coreSymbols.forEach((symbol) => add(symbol, "Core"));

  const dynamicSlots = Math.max(
    0,
    maxTickers - selected.length - macroSlots,
  );
  const dynamicCandidates = [
    ...uniqueSymbols(watchlistSymbols).map((symbol) => ({
      signal: "Watchlist" as const,
      symbol,
    })),
    ...uniqueSymbols(trendingSymbols).map((symbol) => ({
      signal: "Mover" as const,
      symbol,
    })),
    ...uniqueSymbols(selection.dynamicSymbols).map((symbol) => ({
      signal: "Mover" as const,
      symbol,
    })),
  ].filter(
    (ticker) =>
      !hasSymbol(new Set(coreSymbols), ticker.symbol) &&
      !hasSymbol(new Set(macroSymbols), ticker.symbol),
  );

  let dynamicCount = 0;
  dynamicCandidates.forEach((ticker) => {
    if (dynamicCount >= dynamicSlots) return;
    const before = selected.length;

    add(ticker.symbol, ticker.signal);
    if (selected.length > before) dynamicCount += 1;
  });

  macroSymbols.slice(0, macroSlots).forEach((symbol) => add(symbol, "Macro"));

  [
    ...uniqueSymbols(selection.dynamicSymbols),
    ...macroSymbols.slice(macroSlots),
    ...marketScope.tickers.map((ticker) => ticker.symbol),
  ].forEach((symbol) => {
    if (selected.length >= maxTickers) return;
    add(symbol, macroSymbols.includes(symbol) ? "Macro" : "Mover");
  });

  return selected.slice(0, maxTickers);
}

export function buildMarketNewsTickerFallback({
  marketScope,
  signal,
  symbol,
}: {
  marketScope: MarketNewsMarketScope;
  signal: MarketNewsTickerSignal;
  symbol: string;
}): MarketNewsTicker {
  const normalized = normalizeSymbol(symbol);
  const configuredTicker = marketScope.tickers.find(
    (ticker) => normalizeSymbol(ticker.symbol) === normalized,
  );

  if (configuredTicker) {
    return { ...configuredTicker, signal };
  }

  return {
    symbol: normalized,
    label: normalized,
    value: "Quote unavailable",
    change: "No live data",
    tone: "neutral",
    sparkline: [],
    signal,
  };
}
