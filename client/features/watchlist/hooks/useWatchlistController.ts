import * as React from "react";
import { useAuth } from "@/features/auth";
import { supabase } from "@/lib/supabase";
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
  type WatchlistSessionToken,
} from "../lib/watchlistSession";
import type { UpdateWatchlistItemInput, WatchlistItem } from "../types";

export type WatchlistFeedback = {
  message: string;
  tone: "error" | "success";
};

type BusyAction = "add" | "edit" | "move" | "remove" | null;

const EMPTY_ITEMS: WatchlistItem[] = [];

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
  const sessionGeneration = sessionGuard.capture().generation;
  const session = React.useMemo(
    () => ({ generation: sessionGeneration, userId }),
    [sessionGeneration, userId],
  );
  const mounted = React.useRef(true);
  const loadGeneration = React.useRef(0);
  const [stateSession, setStateSession] =
    React.useState<WatchlistSessionToken | null>(null);
  const [savedItems, setItems] = React.useState<WatchlistItem[]>([]);
  const [savedLoading, setLoading] = React.useState(false);
  const [savedLoadError, setLoadError] = React.useState<string | null>(null);
  const [savedFeedback, setFeedback] = React.useState<WatchlistFeedback | null>(
    null,
  );
  const [savedBusyAction, setBusyAction] = React.useState<BusyAction>(null);
  // Hide private state in the account-change render, before effects reset it.
  const ownsState =
    !authLoading &&
    stateSession !== null &&
    sessionGuard.isCurrent(stateSession);
  const items = ownsState ? savedItems : EMPTY_ITEMS;
  const loading =
    !authLoading && Boolean(userId) && (!ownsState || savedLoading);
  const loadError = ownsState ? savedLoadError : null;
  const feedback = ownsState ? savedFeedback : null;
  const busyAction = ownsState ? savedBusyAction : null;
  const isCurrentSession = React.useCallback(
    () => mounted.current && sessionGuard.isCurrent(session),
    [session, sessionGuard],
  );

  React.useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      loadGeneration.current += 1;
    };
  }, []);

  React.useEffect(() => {
    loadGeneration.current += 1;
    setStateSession(session);
    setItems([]);
    setLoading(Boolean(userId));
    setLoadError(null);
    setFeedback(null);
    setBusyAction(null);
  }, [session, userId]);

  const load = React.useCallback(async () => {
    if (authLoading || !userId || !isCurrentSession()) return;

    const generation = ++loadGeneration.current;
    setLoading(true);
    setLoadError(null);

    try {
      const nextItems = await repository.list(userId);
      if (!isCurrentSession() || generation !== loadGeneration.current) return;
      setItems(nextItems);
    } catch (error: unknown) {
      if (!isCurrentSession() || generation !== loadGeneration.current) return;
      setLoadError(
        errorMessage(
          error,
          "We couldn't load your watchlist. Please try again.",
        ),
      );
    } finally {
      if (isCurrentSession() && generation === loadGeneration.current)
        setLoading(false);
    }
  }, [authLoading, isCurrentSession, repository, userId]);

  React.useEffect(() => {
    if (authLoading) return;

    void load();
  }, [authLoading, load, userId]);

  React.useEffect(() => {
    if (feedback?.tone !== "success") return;

    const expectedFeedback = feedback;
    const timer = globalThis.setTimeout(() => {
      setFeedback((current) => (current === expectedFeedback ? null : current));
    }, WATCHLIST_SUCCESS_FEEDBACK_DURATION_MS);

    return () => {
      globalThis.clearTimeout(timer);
    };
  }, [feedback]);

  const addItem = React.useCallback(
    async (rawSymbol: string) => {
      if (!userId || !ownsState || busyAction || !isCurrentSession())
        return false;

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
        if (!isCurrentSession()) return false;
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
        if (!isCurrentSession()) return false;
        setFeedback({
          message: errorMessage(
            error,
            "We couldn't add that symbol. Please try again.",
          ),
          tone: "error",
        });
        return false;
      } finally {
        if (isCurrentSession()) setBusyAction(null);
      }
    },
    [busyAction, isCurrentSession, items, ownsState, repository, userId],
  );

  const updateItem = React.useCallback(
    async (symbol: string, input: UpdateWatchlistItemInput) => {
      if (!userId || !ownsState || busyAction || !isCurrentSession())
        return false;

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
        if (!isCurrentSession()) return false;
        setItems((current) =>
          current.map((item) => (item.symbol === symbol ? saved : item)),
        );
        setFeedback({
          message: `${symbol} research details were saved.`,
          tone: "success",
        });
        return true;
      } catch (error: unknown) {
        if (!isCurrentSession()) return false;
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
        if (isCurrentSession()) setBusyAction(null);
      }
    },
    [busyAction, isCurrentSession, items, ownsState, repository, userId],
  );

  const removeItem = React.useCallback(
    async (symbol: string) => {
      if (!userId || !ownsState || busyAction || !isCurrentSession())
        return false;

      const previous = items;
      setBusyAction("remove");
      setFeedback(null);
      setItems(removeWatchlistItem(items, symbol));

      try {
        await repository.remove(userId, symbol);
        if (!isCurrentSession()) return false;
        setFeedback({
          message: `${symbol} was removed from your watchlist.`,
          tone: "success",
        });
        return true;
      } catch (error: unknown) {
        if (!isCurrentSession()) return false;
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
        if (isCurrentSession()) setBusyAction(null);
      }
    },
    [busyAction, isCurrentSession, items, ownsState, repository, userId],
  );

  const moveItem = React.useCallback(
    async (symbol: string, direction: "down" | "up") => {
      if (!userId || !ownsState || busyAction || !isCurrentSession())
        return false;

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
        if (!isCurrentSession()) return false;
        setFeedback({ message: "Custom order saved.", tone: "success" });
        return true;
      } catch (error: unknown) {
        if (!isCurrentSession()) return false;
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
        if (isCurrentSession()) setBusyAction(null);
      }
    },
    [busyAction, isCurrentSession, items, ownsState, repository, userId],
  );

  return {
    addItem,
    authenticated: Boolean(userId),
    authLoading,
    busyAction,
    clearFeedback: () => {
      if (isCurrentSession()) setFeedback(null);
    },
    feedback,
    items,
    loadError,
    loading,
    moveItem,
    removeItem,
    retry: load,
    sessionKey: `${sessionGeneration}:${userId ?? "signed-out"}`,
    updateItem,
  };
}
