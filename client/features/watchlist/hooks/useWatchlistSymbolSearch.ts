import * as React from "react";
import { getVisibleSearchResults } from "../lib/watchlistSearch";

export type WatchlistSymbolSearchResult = {
  exchange: string | null;
  name: string;
  quoteType: "CRYPTOCURRENCY" | "EQUITY" | "ETF" | "INDEX";
  symbol: string;
};

type SearchResponse =
  | { results: WatchlistSymbolSearchResult[] }
  | { error: string };

export function useWatchlistSymbolSearch(query: string) {
  const normalizedQuery = query.trim().replace(/\s+/g, " ");
  const [resultState, setResultState] = React.useState<{
    query: string;
    results: WatchlistSymbolSearchResult[];
  }>({ query: "", results: [] });
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const results = getVisibleSearchResults(
    resultState.query,
    normalizedQuery,
    resultState.results,
  );

  React.useEffect(() => {
    if (!normalizedQuery) {
      setResultState({ query: "", results: [] });
      setLoading(false);
      setError(null);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError(null);

      void fetch(
        `/api/market/symbol-search?q=${encodeURIComponent(normalizedQuery)}`,
        { signal: controller.signal },
      )
        .then(async (response) => {
          const payload = (await response.json()) as SearchResponse;
          if (!response.ok || "error" in payload) {
            throw new Error(
              "error" in payload
                ? payload.error
                : "Symbol search is temporarily unavailable.",
            );
          }
          return payload.results;
        })
        .then((nextResults) => {
          if (!controller.signal.aborted) {
            setResultState({ query: normalizedQuery, results: nextResults });
          }
        })
        .catch((requestError: unknown) => {
          if (controller.signal.aborted) return;
          setResultState({ query: normalizedQuery, results: [] });
          setError(
            requestError instanceof Error && requestError.message
              ? requestError.message
              : "Symbol search is temporarily unavailable.",
          );
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 250);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [normalizedQuery]);

  return {
    error,
    hasSearched: Boolean(
      normalizedQuery &&
        resultState.query === normalizedQuery &&
        !loading,
    ),
    loading,
    results,
  };
}
