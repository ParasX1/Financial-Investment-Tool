import { useMarketQuotes } from "@/features/market-data";

export function useWatchlistQuotes(symbols: readonly string[]) {
  return useMarketQuotes(symbols);
}
