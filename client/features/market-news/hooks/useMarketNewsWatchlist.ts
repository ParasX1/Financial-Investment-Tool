import { useSavedWatchlistSymbols } from "@/features/watchlist";

const MARKET_NEWS_WATCHLIST_ERROR =
  "Saved tickers could not be loaded. Watchlist news may be incomplete.";

export function useMarketNewsWatchlist() {
  const savedSymbols = useSavedWatchlistSymbols();

  return {
    authenticated: savedSymbols.authenticated,
    error: savedSymbols.failed ? MARKET_NEWS_WATCHLIST_ERROR : null,
    loading: savedSymbols.loading,
    symbols: savedSymbols.symbols,
  };
}
