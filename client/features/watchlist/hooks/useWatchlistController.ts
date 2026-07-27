import * as React from "react";
import { useAuth } from "@/components/authContext";
import supabase from "@/components/supabase";
import {
  WATCHLIST_LIMIT,
  WATCHLIST_SUCCESS_FEEDBACK_DURATION_MS,
} from "../constants";
import { createWatchlistRepository } from "../data/watchlistRepository";
import {
  moveWatchlistItem,
  normalizeWatchlistSymbol,
  removeWatchlistItem,
  validateWatchlistSymbol,
} from "../lib/watchlistState";
import {
  createWatchlistSessionGuard,
  type WatchlistSessionGuard,
} from "../lib/watchlistSession";
import type {
  UpdateWatchlistItemInput,
  WatchlistItem,
} from "../types";

export type WatchlistFeedback = {
  message: string;
  tone: "error" | "success";
};

type BusyAction = "add" | "edit" | "move" | "remove" | null;

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function useWatchlistController() {
  const { loading: authLoading, user } = useAuth();
  const repository = React.useMemo(
    () => createWatchlistRepository(supabase),
    [],
  );
  const userId = user?.id ?? null;
  const sessionGuardRef = React.useRef<WatchlistSessionGuard | null>(null);
  if (!sessionGuardRef.current) {
    sessionGuardRef.current = createWatchlistSessionGuard(userId);
  }
  const sessionGuard = sessionGuardRef.current;
  sessionGuard.sync(userId);
  const loadGeneration = React.useRef(0);
  const [items, setItems] = React.useState<WatchlistItem[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [feedback, setFeedback] = React.useState<WatchlistFeedback | null>(null);
  const [busyAction, setBusyAction] = React.useState<BusyAction>(null);

  const load = React.useCallback(async () => {
    if (!userId) return;

    const generation = ++loadGeneration.current;
    setLoading(true);
    setLoadError(null);

    try {
      const nextItems = await repository.list(userId);
      if (generation !== loadGeneration.current) return;
      setItems(nextItems);
    } catch (error: unknown) {
      if (generation !== loadGeneration.current) return;
      setLoadError(
        errorMessage(
          error,
          "We couldn't load your watchlist. Please try again.",
        ),
      );
    } finally {
      if (generation === loadGeneration.current) setLoading(false);
    }
  }, [repository, userId]);

  React.useEffect(() => {
    if (authLoading) return;

    if (!userId) {
      loadGeneration.current += 1;
      setItems([]);
      setLoading(false);
      setLoadError(null);
      setFeedback(null);
      setBusyAction(null);
      return;
    }

    void load();
  }, [authLoading, load, userId]);

  React.useEffect(() => {
    if (feedback?.tone !== "success") return;

    const expectedFeedback = feedback;
    const timer = globalThis.setTimeout(() => {
      setFeedback((current) =>
        current === expectedFeedback ? null : current,
      );
    }, WATCHLIST_SUCCESS_FEEDBACK_DURATION_MS);

    return () => {
      globalThis.clearTimeout(timer);
    };
  }, [feedback]);

  const addItem = React.useCallback(
    async (rawSymbol: string) => {
      if (!userId || busyAction) return false;
      const session = sessionGuard.capture();

      const symbol = normalizeWatchlistSymbol(rawSymbol);
      const validationError = validateWatchlistSymbol(symbol);
      if (validationError) {
        setFeedback({ message: validationError, tone: "error" });
        return false;
      }
      if (items.some((item) => item.symbol === symbol)) {
        setFeedback({
          message: `${symbol} is already in your watchlist.`,
          tone: "error",
        });
        return false;
      }
      if (items.length >= WATCHLIST_LIMIT) {
        setFeedback({
          message: `Your watchlist can hold up to ${WATCHLIST_LIMIT} ideas. Remove one before adding another.`,
          tone: "error",
        });
        return false;
      }

      setBusyAction("add");
      setFeedback(null);
      try {
        const saved = await repository.add({
          note: null,
          position: items.length,
          symbol,
          targetPrice: null,
          userId,
        });
        if (!sessionGuard.isCurrent(session)) return false;
        setItems((current) =>
          current.some((item) => item.symbol === saved.symbol)
            ? current
            : [...current, saved],
        );
        setFeedback({
          message: `${saved.symbol} was added to your watchlist.`,
          tone: "success",
        });
        return true;
      } catch (error: unknown) {
        if (!sessionGuard.isCurrent(session)) return false;
        setFeedback({
          message: errorMessage(
            error,
            "We couldn't add that symbol. Please try again.",
          ),
          tone: "error",
        });
        return false;
      } finally {
        if (sessionGuard.isCurrent(session)) setBusyAction(null);
      }
    },
    [busyAction, items, repository, sessionGuard, userId],
  );

  const updateItem = React.useCallback(
    async (symbol: string, input: UpdateWatchlistItemInput) => {
      if (!userId || busyAction) return false;
      const session = sessionGuard.capture();

      const previous = items;
      setBusyAction("edit");
      setFeedback(null);
      setItems((current) =>
        current.map((item) =>
          item.symbol === symbol ? { ...item, ...input } : item,
        ),
      );

      try {
        const saved = await repository.update(userId, symbol, input);
        if (!sessionGuard.isCurrent(session)) return false;
        setItems((current) =>
          current.map((item) => (item.symbol === symbol ? saved : item)),
        );
        setFeedback({
          message: `${symbol} research details were saved.`,
          tone: "success",
        });
        return true;
      } catch (error: unknown) {
        if (!sessionGuard.isCurrent(session)) return false;
        setItems(previous);
        setFeedback({
          message: errorMessage(
            error,
            "We couldn't save those details. Your previous values were restored.",
          ),
          tone: "error",
        });
        return false;
      } finally {
        if (sessionGuard.isCurrent(session)) setBusyAction(null);
      }
    },
    [busyAction, items, repository, sessionGuard, userId],
  );

  const removeItem = React.useCallback(
    async (symbol: string) => {
      if (!userId || busyAction) return false;
      const session = sessionGuard.capture();

      const previous = items;
      setBusyAction("remove");
      setFeedback(null);
      setItems(removeWatchlistItem(items, symbol));

      try {
        await repository.remove(userId, symbol);
        if (!sessionGuard.isCurrent(session)) return false;
        setFeedback({
          message: `${symbol} was removed from your watchlist.`,
          tone: "success",
        });
        return true;
      } catch (error: unknown) {
        if (!sessionGuard.isCurrent(session)) return false;
        setItems(previous);
        setFeedback({
          message: errorMessage(
            error,
            "We couldn't remove that item. It has been restored.",
          ),
          tone: "error",
        });
        return false;
      } finally {
        if (sessionGuard.isCurrent(session)) setBusyAction(null);
      }
    },
    [busyAction, items, repository, sessionGuard, userId],
  );

  const moveItem = React.useCallback(
    async (symbol: string, direction: "down" | "up") => {
      if (!userId || busyAction) return false;
      const session = sessionGuard.capture();

      const previous = items;
      const next = moveWatchlistItem(items, symbol, direction);
      const orderChanged = next.some(
        (item, index) => item.symbol !== items[index]?.symbol,
      );
      if (!orderChanged) return false;

      setBusyAction("move");
      setFeedback(null);
      setItems(next);
      try {
        await repository.saveOrder(
          userId,
          next.map((item) => item.symbol),
        );
        if (!sessionGuard.isCurrent(session)) return false;
        setFeedback({ message: "Custom order saved.", tone: "success" });
        return true;
      } catch (error: unknown) {
        if (!sessionGuard.isCurrent(session)) return false;
        setItems(previous);
        setFeedback({
          message: errorMessage(
            error,
            "We couldn't save that order. The previous order was restored.",
          ),
          tone: "error",
        });
        return false;
      } finally {
        if (sessionGuard.isCurrent(session)) setBusyAction(null);
      }
    },
    [busyAction, items, repository, sessionGuard, userId],
  );

  return {
    addItem,
    authenticated: Boolean(userId),
    authLoading,
    busyAction,
    clearFeedback: () => setFeedback(null),
    feedback,
    items,
    loadError,
    loading,
    moveItem,
    removeItem,
    retry: load,
    updateItem,
  };
}
