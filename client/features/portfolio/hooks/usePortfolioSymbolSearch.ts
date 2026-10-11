import { useMarketSymbolSearch } from "@/features/market-data";

export type { MarketSymbolSearchResult as PortfolioSymbolSearchResult } from "@/features/market-data";

export function usePortfolioSymbolSearch(query: string) {
  return useMarketSymbolSearch(query);
}
