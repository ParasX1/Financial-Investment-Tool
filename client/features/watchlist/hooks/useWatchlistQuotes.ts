import { useMarketQuotes } from "@/features/market-data/hooks/useMarketQuotes";

export function useWatchlistQuotes(symbols: readonly string[]) {
  return useMarketQuotes(symbols);
}
