import * as React from "react";
import { useAuth } from "@/features/auth";
import { supabase } from "@/lib/supabase";
import { createSavedWatchlistSymbolsReader } from "../data/savedWatchlistSymbolsReader";

export interface SavedWatchlistSymbolsState {
  authenticated: boolean;
  failed: boolean;
  loading: boolean;
  symbols: readonly string[];
}

interface SavedWatchlistSymbolsLoadState {
  failed: boolean;
  loading: boolean;
  ownerUserId: string | null;
  symbols: readonly string[];
}

const EMPTY_SAVED_SYMBOLS_STATE = {
  failed: false,
  loading: false,
  ownerUserId: null,
  symbols: [],
} satisfies SavedWatchlistSymbolsLoadState;

export function useSavedWatchlistSymbols(): SavedWatchlistSymbolsState {
  const { loading: authLoading, user } = useAuth();
  const userId = user?.id ?? null;
  const [state, setState] = React.useState<SavedWatchlistSymbolsLoadState>(
    EMPTY_SAVED_SYMBOLS_STATE,
  );
  const reader = React.useMemo(
    () => createSavedWatchlistSymbolsReader(supabase),
    [],
  );

  React.useEffect(() => {
    if (authLoading || !userId) {
      setState(EMPTY_SAVED_SYMBOLS_STATE);
      return;
    }

    let active = true;
    setState({
      failed: false,
      loading: true,
      ownerUserId: userId,
      symbols: [],
    });

    reader
      .list(userId)
      .then((symbols) => {
        if (!active) return;
        setState({
          failed: false,
          loading: false,
          ownerUserId: userId,
          symbols,
        });
      })
      .catch(() => {
        if (!active) return;
        setState({
          failed: true,
          loading: false,
          ownerUserId: userId,
          symbols: [],
        });
      });

    return () => {
      active = false;
    };
  }, [authLoading, reader, userId]);

  const authenticated = !authLoading && Boolean(userId);
  const ownsState = authenticated && state.ownerUserId === userId;

  return {
    authenticated,
    failed: ownsState ? state.failed : false,
    loading: authenticated ? !ownsState || state.loading : false,
    symbols: ownsState ? state.symbols : [],
  };
}
