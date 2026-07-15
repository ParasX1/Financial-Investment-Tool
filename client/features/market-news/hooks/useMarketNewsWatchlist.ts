import * as React from "react";
import { useAuth } from "@/components/authContext";
import supabase from "@/components/supabase";
import { createWatchlistRepository } from "@/features/watchlist";

export function useMarketNewsWatchlist() {
  const { user } = useAuth();
  const [mounted, setMounted] = React.useState(false);
  const [symbols, setSymbols] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const repository = React.useMemo(
    () => createWatchlistRepository(supabase),
    [],
  );

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!mounted || !user) {
      setSymbols([]);
      setLoading(false);
      setError(null);
      return;
    }

    const userId = user.id;
    let alive = true;
    setLoading(true);
    setError(null);

    async function loadWatchlist() {
      const items = await repository.list(userId);

      if (!alive) return;
      setSymbols(items.map((item) => item.symbol));
    }

    loadWatchlist()
      .catch((error) => {
        if (!alive) return;
        console.error("load watchlist failed:", error);
        setSymbols([]);
        setError("Saved tickers could not be loaded. Watchlist news may be incomplete.");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [mounted, repository, user]);

  return {
    authenticated: mounted && Boolean(user),
    error: mounted ? error : null,
    loading: mounted ? loading : false,
    symbols: mounted ? symbols : [],
  };
}
