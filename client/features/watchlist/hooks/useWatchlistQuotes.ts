import * as React from "react";
import type { WatchlistQuote } from "../types";

type QuoteResponse =
  | { quotes: WatchlistQuote[]; unavailableSymbols?: string[] }
  | { error: string };

const PARTIAL_QUOTES_UNAVAILABLE = "Some quotes are temporarily unavailable.";
const ALL_QUOTES_UNAVAILABLE = "Quotes are currently unavailable.";

export function useWatchlistQuotes(symbols: readonly string[]) {
  const symbolsKey = React.useMemo(
    () => symbols.map((symbol) => symbol.trim().toUpperCase()).join(","),
    [symbols],
  );
  const [quotes, setQuotes] = React.useState<Record<string, WatchlistQuote>>({});
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = React.useState<Date | null>(null);
  const [refreshVersion, setRefreshVersion] = React.useState(0);

  React.useEffect(() => {
    if (!symbolsKey) {
      setQuotes({});
      setLoading(false);
      setError(null);
      setLastUpdated(null);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    void fetch(
      `/api/market/watchlist-quotes?symbols=${encodeURIComponent(symbolsKey)}`,
      { signal: controller.signal },
    )
      .then(async (response) => {
        const payload = (await response.json()) as QuoteResponse;
        if (!response.ok || "error" in payload) {
          throw new Error(
            "error" in payload
              ? payload.error
              : "Market data is temporarily unavailable.",
          );
        }
        return payload;
      })
      .then((payload) => {
        if (controller.signal.aborted) return;
        const nextQuotes = payload.quotes;
        setQuotes(
          Object.fromEntries(
            nextQuotes.map((quote) => [quote.symbol, quote] as const),
          ),
        );
        const unavailableCount = payload.unavailableSymbols?.length ?? 0;
        setError(
          unavailableCount > 0 && unavailableCount === nextQuotes.length
            ? ALL_QUOTES_UNAVAILABLE
            : unavailableCount > 0
              ? PARTIAL_QUOTES_UNAVAILABLE
              : null,
        );
        setLastUpdated(new Date());
      })
      .catch((requestError: unknown) => {
        if (controller.signal.aborted) return;
        setError(
          requestError instanceof Error && requestError.message
            ? requestError.message
            : "Market data is temporarily unavailable.",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [refreshVersion, symbolsKey]);

  return {
    error,
    lastUpdated,
    loading,
    quotes,
    refresh: () => setRefreshVersion((version) => version + 1),
  };
}
