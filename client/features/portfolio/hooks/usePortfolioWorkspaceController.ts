import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  loadPortfolioConfig,
  savePortfolioConfig,
} from "../data/portfolioPrefs";
import { METRIC_REGISTRY } from "../data/metricRegistry";
import { validateAnalysisRange } from "../lib/portfolioAnalytics";
import {
  createDefaultWorkspace,
  getWorkspaceStorageKey,
  hasPendingWorkspaceDraft,
  mergePortfolioSymbolOptions,
  portfolioWorkspaceReducer,
  readPortfolioWorkspace,
  selectFocusedCard,
  toLocalDate,
  writePortfolioWorkspace,
  type PortfolioWorkspaceAction,
  type PortfolioWorkspaceStorage,
} from "../state";
import type {
  PortfolioAnalysisInputs,
  PortfolioMetricType,
  PortfolioObserverWindow,
  PortfolioView,
  PortfolioWorkspaceState,
} from "../types";

const getBrowserStorage = (): PortfolioWorkspaceStorage | null => {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

export const usePortfolioWorkspaceController = ({
  userId,
  authLoading,
}: {
  userId?: string;
  authLoading: boolean;
}) => {
  const today = toLocalDate(new Date());
  const [workspace, setWorkspace] = useState<PortfolioWorkspaceState>(() =>
    createDefaultWorkspace(today),
  );
  const [draftSymbols, setDraftSymbols] = useState<string[]>([]);
  const [draftInputs, setDraftInputs] = useState<PortfolioAnalysisInputs>(
    workspace.globalInputs,
  );
  const currentStorageKey = getWorkspaceStorageKey(userId);
  const hydratedStorageKeyRef = useRef<string | null>(null);
  const [hydratedStorageKey, setHydratedStorageKey] = useState<string | null>(
    null,
  );
  const [announcement, setAnnouncement] = useState("");

  const dispatch = useCallback((action: PortfolioWorkspaceAction) => {
    setWorkspace((current) => portfolioWorkspaceReducer(current, action));
  }, []);

  useEffect(() => {
    let cancelled = false;
    hydratedStorageKeyRef.current = null;
    setHydratedStorageKey(null);

    if (authLoading) {
      return () => {
        cancelled = true;
      };
    }

    const commitHydratedWorkspace = (hydrated: PortfolioWorkspaceState) => {
      if (cancelled) return;
      setWorkspace(hydrated);
      setDraftSymbols(hydrated.symbols);
      setDraftInputs(hydrated.globalInputs);
      hydratedStorageKeyRef.current = currentStorageKey;
      setHydratedStorageKey(currentStorageKey);
    };

    const hydrate = async () => {
      const local = readPortfolioWorkspace(getBrowserStorage(), userId, today);
      if (local) {
        commitHydratedWorkspace(local);
        return;
      }

      const initial = createDefaultWorkspace(today);
      let hydrated = initial;
      if (userId) {
        try {
          const remote = await loadPortfolioConfig(userId);
          if (cancelled) return;
          hydrated = {
            ...initial,
            symbols: remote?.tags?.slice(0, 5) ?? [],
          };
        } catch {
          // The local workspace remains fully usable without remote preferences.
        }
      }
      commitHydratedWorkspace(hydrated);
    };
    hydrate();
    return () => {
      cancelled = true;
      if (hydratedStorageKeyRef.current === currentStorageKey) {
        hydratedStorageKeyRef.current = null;
      }
    };
  }, [authLoading, currentStorageKey, today, userId]);

  useEffect(() => {
    if (
      authLoading ||
      hydratedStorageKey !== currentStorageKey ||
      hydratedStorageKeyRef.current !== currentStorageKey ||
      typeof window === "undefined"
    ) {
      return;
    }
    const timer = window.setTimeout(() => {
      writePortfolioWorkspace(getBrowserStorage(), userId, workspace);
    }, 220);
    return () => window.clearTimeout(timer);
  }, [authLoading, currentStorageKey, hydratedStorageKey, userId, workspace]);

  useEffect(() => {
    if (
      authLoading ||
      hydratedStorageKey !== currentStorageKey ||
      hydratedStorageKeyRef.current !== currentStorageKey ||
      !userId ||
      typeof window === "undefined"
    ) {
      return;
    }
    const timer = window.setTimeout(() => {
      savePortfolioConfig(userId, { tags: workspace.symbols }).catch(
        () => undefined,
      );
    }, 500);
    return () => window.clearTimeout(timer);
  }, [
    authLoading,
    currentStorageKey,
    hydratedStorageKey,
    userId,
    workspace.symbols,
  ]);

  const focusedCard = selectFocusedCard(workspace);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target?.matches("input, textarea, select, [contenteditable='true']")
      ) {
        return;
      }
      if (event.key === "Escape" && workspace.view.mode !== "board") {
        dispatch({ type: "setView", view: { mode: "board" } });
        setAnnouncement("Returned to Board");
      } else if (event.key.toLowerCase() === "g") {
        dispatch({ type: "setView", view: { mode: "board" } });
      } else if (event.key.toLowerCase() === "o") {
        dispatch({ type: "setView", view: { mode: "observation" } });
      } else if (event.key.toLowerCase() === "f" && focusedCard) {
        dispatch({
          type: "setView",
          view: { mode: "focus", cardId: focusedCard.id },
        });
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [dispatch, focusedCard, workspace.view.mode]);

  const symbolOptions = useMemo(
    () => mergePortfolioSymbolOptions(draftSymbols, []),
    [draftSymbols],
  );
  const pending = hasPendingWorkspaceDraft(
    workspace,
    draftSymbols,
    draftInputs,
  );
  const rangeError = validateAnalysisRange(
    draftInputs.startDate,
    draftInputs.endDate,
    today,
  );

  const applyDraft = () => {
    if (rangeError) return;
    setWorkspace((current) => {
      const withSymbols = portfolioWorkspaceReducer(current, {
        type: "setSymbols",
        symbols: draftSymbols,
      });
      const withGlobalInputs = portfolioWorkspaceReducer(withSymbols, {
        type: "updateGlobalInputs",
        patch: draftInputs,
      });
      return portfolioWorkspaceReducer(withGlobalInputs, {
        type: "syncCardDateOverridesToGlobal",
      });
    });
    setAnnouncement(
      `Analysis applied to ${draftSymbols.length} ${
        draftSymbols.length === 1 ? "symbol" : "symbols"
      }`,
    );
  };

  const setView = (view: PortfolioView) => dispatch({ type: "setView", view });
  const showBoard = () => setView({ mode: "board" });
  const showFocus = () => {
    if (focusedCard) setView({ mode: "focus", cardId: focusedCard.id });
  };
  const showObservation = () => setView({ mode: "observation" });
  const updateCardMetric = (cardId: string, metricType: PortfolioMetricType) =>
    dispatch({ type: "setCardMetric", cardId, metricType });
  const overrideCard = (
    cardId: string,
    patch: Partial<PortfolioAnalysisInputs>,
  ) => dispatch({ type: "overrideCardInputs", cardId, patch });
  const focusCard = (cardId: string) => {
    setView({ mode: "focus", cardId });
    setAnnouncement(
      `${
        METRIC_REGISTRY[
          workspace.cards.find((card) => card.id === cardId)?.metricType ??
            workspace.cards[0].metricType
        ].label
      } opened in Focus`,
    );
  };
  const resetCardInputs = (cardId: string) =>
    dispatch({ type: "resetCardInputs", cardId });
  const promoteCard = (cardId: string) =>
    dispatch({ type: "promoteCard", cardId });
  const duplicateCard = (cardId: string) =>
    dispatch({ type: "duplicateCard", cardId });
  const deleteCard = (cardId: string) =>
    dispatch({ type: "deleteCard", cardId });
  const updateObserverWindow = (
    cardId: string,
    patch: Partial<PortfolioObserverWindow>,
  ) => dispatch({ type: "updateObserverWindow", cardId, patch });
  const setObserverWindowVisibility = (cardId: string, visible: boolean) =>
    dispatch({ type: "setObserverWindowVisibility", cardId, visible });
  const arrangeObserver = () => {
    if (typeof window === "undefined") return;
    dispatch({
      type: "arrangeObserver",
      width: window.innerWidth,
      height: window.innerHeight - 58,
    });
  };

  const getCardProps = (cardId: string) => ({
    symbols: workspace.symbols,
    draftSymbolCount: draftSymbols.length,
    globalInputs: workspace.globalInputs,
    hasPendingDraft: pending,
    today,
    cardCount: workspace.cards.length,
    onMetricChange: (metricType: PortfolioMetricType) =>
      updateCardMetric(cardId, metricType),
    onOverride: (patch: Partial<PortfolioAnalysisInputs>) =>
      overrideCard(cardId, patch),
    onResetInputs: () => resetCardInputs(cardId),
    onFocus: () => focusCard(cardId),
    onPromote: () => promoteCard(cardId),
    onDuplicate: () => duplicateCard(cardId),
    onDelete: () => deleteCard(cardId),
  });

  return {
    workspace,
    draftSymbols,
    setDraftSymbols,
    draftInputs,
    setDraftInputs,
    today,
    announcement,
    symbolOptions,
    pending,
    rangeError,
    focusedCard,
    getCardProps,
    actions: {
      applyDraft,
      showBoard,
      showFocus,
      showObservation,
      updateCardMetric,
      overrideCard,
      focusCard,
      resetCardInputs,
      promoteCard,
      duplicateCard,
      deleteCard,
      updateObserverWindow,
      setObserverWindowVisibility,
      arrangeObserver,
    },
  };
};
