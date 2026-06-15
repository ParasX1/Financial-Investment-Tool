import * as React from "react";
import { useAuth } from "@/components/authContext";
import supabase from "@/components/supabase";

export function useMarketNewsWatchlist() {
  const { user } = useAuth();
  const [mounted, setMounted] = React.useState(false);
  const [symbols, setSymbols] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!mounted || !user) {
      setSymbols([]);
      setLoading(false);
      return;
    }

    const userId = user.id;
    let alive = true;
    setLoading(true);

    async function loadWatchlist() {
      const { data, error } = await supabase
        .from("user_watchlist")
        .select("symbol, position")
        .eq("user_id", userId)
        .order("position", { ascending: true });

      if (!alive) return;

      if (error) {
        console.error("load watchlist failed:", error);
        setSymbols([]);
        return;
      }

      setSymbols(
        (data ?? [])
          .map((row) => row.symbol)
          .filter((symbol): symbol is string => Boolean(symbol)),
      );
    }

    loadWatchlist()
      .catch((error) => {
        if (!alive) return;
        console.error("load watchlist failed:", error);
        setSymbols([]);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [mounted, user]);

  return {
    authenticated: mounted && Boolean(user),
    loading: mounted ? loading : false,
    symbols: mounted ? symbols : [],
  };
}
