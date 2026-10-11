import {
  useMarketSymbolSearch,
  type MarketSymbolSearchResult,
} from "@/features/market-data";

export type { MarketSymbolSearchResult as WatchlistSymbolSearchResult } from "@/features/market-data";

export function useWatchlistSymbolSearch(query: string): Omit<
  ReturnType<typeof useMarketSymbolSearch>,
  "results"
> & {
  results: readonly MarketSymbolSearchResult[];
} {
  return useMarketSymbolSearch(query);
}
