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

type PreferenceHydration = {
  storageKey: string;
  status: "loading" | "ready" | "failed";
} | null;

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
  const [draftSymbols, setDraftSymbolsState] = useState<string[]>([]);
  const [draftInputs, setDraftInputs] = useState<PortfolioAnalysisInputs>(
    workspace.globalInputs,
  );
  const currentStorageKey = getWorkspaceStorageKey(userId);
  const hydratedStorageKeyRef = useRef<string | null>(null);
  const symbolsAppliedRef = useRef(false);
  const draftSymbolsEditedRef = useRef(false);
  const [preferenceHydration, setPreferenceHydration] =
    useState<PreferenceHydration>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [saveAttempt, setSaveAttempt] = useState(0);
  const [remoteSaveFailed, setRemoteSaveFailed] = useState(false);
  const [localSaveFailed, setLocalSaveFailed] = useState(false);
  const [announcement, setAnnouncement] = useState("");

  const setDraftSymbols = useCallback((symbols: string[]) => {
    draftSymbolsEditedRef.current = true;
    setDraftSymbolsState(symbols);
  }, []);

  const dispatch = useCallback((action: PortfolioWorkspaceAction) => {
    setWorkspace((current) => portfolioWorkspaceReducer(current, action));
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (authLoading) {
      hydratedStorageKeyRef.current = null;
      setPreferenceHydration(null);
      return () => {
        cancelled = true;
      };
    }

    const sameScope = hydratedStorageKeyRef.current === currentStorageKey;
    hydratedStorageKeyRef.current = currentStorageKey;
    setPreferenceHydration({
      storageKey: currentStorageKey,
      status: "loading",
    });

    if (!sameScope) {
      symbolsAppliedRef.current = false;
      draftSymbolsEditedRef.current = false;
      setRemoteSaveFailed(false);
      setLocalSaveFailed(false);
      // Hydration follows account changes or an explicit retry, not date rollover.
      const hydrationDate = toLocalDate(new Date());
      const local = readPortfolioWorkspace(
        getBrowserStorage(),
        userId,
        hydrationDate,
      );
      const initial = local ?? createDefaultWorkspace(hydrationDate);
      setWorkspace(initial);
      setDraftSymbolsState(initial.symbols);
      setDraftInputs(initial.globalInputs);

      if (!userId || local) {
        setPreferenceHydration({
          storageKey: currentStorageKey,
          status: "ready",
        });
        return () => {
          cancelled = true;
        };
      }
    }

    const hydrate = async () => {
      if (userId) {
        try {
          const remote = await loadPortfolioConfig(userId);
          if (cancelled) return;
          const symbols = remote.tags.slice(0, 5);
          if (!symbolsAppliedRef.current) {
            setWorkspace((current) => ({ ...current, symbols }));
          }
          if (!draftSymbolsEditedRef.current) setDraftSymbolsState(symbols);
        } catch {
          if (!cancelled) {
            setPreferenceHydration({
              storageKey: currentStorageKey,
              status: "failed",
            });
          }
          return;
        }
      }
      if (!cancelled) {
        setPreferenceHydration({
          storageKey: currentStorageKey,
          status: "ready",
        });
      }
    };
    void hydrate();
    return () => {
      cancelled = true;
    };
  }, [authLoading, currentStorageKey, loadAttempt, userId]);

  const preferencesReady =
    preferenceHydration?.storageKey === currentStorageKey &&
    preferenceHydration.status === "ready";

  useEffect(() => {
    if (
      authLoading ||
      !preferencesReady ||
      hydratedStorageKeyRef.current !== currentStorageKey ||
      typeof window === "undefined"
    ) {
      return;
    }
    const timer = window.setTimeout(() => {
      try {
        const storage = getBrowserStorage();
        if (!storage) {
          setLocalSaveFailed(true);
          return;
        }
        writePortfolioWorkspace(storage, userId, workspace);
        setLocalSaveFailed(false);
      } catch {
        setLocalSaveFailed(true);
      }
    }, 220);
    return () => window.clearTimeout(timer);
  }, [
    authLoading,
    currentStorageKey,
    preferencesReady,
    saveAttempt,
    userId,
    workspace,
  ]);

  useEffect(() => {
    if (
      authLoading ||
      !preferencesReady ||
      hydratedStorageKeyRef.current !== currentStorageKey ||
      !userId ||
      typeof window === "undefined"
    ) {
      return;
    }
    let active = true;
    const timer = window.setTimeout(() => {
      savePortfolioConfig(userId, { tags: workspace.symbols })
        .then(() => {
          if (active) setRemoteSaveFailed(false);
        })
        .catch(() => {
          if (active) setRemoteSaveFailed(true);
        });
    }, 500);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [
    authLoading,
    currentStorageKey,
    preferencesReady,
    saveAttempt,
    userId,
    workspace.symbols,
  ]);

  const focusedCard = selectFocusedCard(workspace);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        event.defaultPrevented ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        event.shiftKey ||
        event.isComposing ||
        event.repeat
      )
        return;
      const target = event.target as HTMLElement | null;
      if (
        target?.closest?.(
          "input, textarea, select, [contenteditable]:not([contenteditable='false'])",
        )
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
    if (
      rangeError ||
      authLoading ||
      hydratedStorageKeyRef.current !== currentStorageKey
    )
      return;
    const nextSymbols = portfolioWorkspaceReducer(workspace, {
      type: "setSymbols",
      symbols: draftSymbols,
    }).symbols;
    if (
      nextSymbols.length !== workspace.symbols.length ||
      nextSymbols.some((symbol, index) => symbol !== workspace.symbols[index])
    ) {
      symbolsAppliedRef.current = true;
    }
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

  const retryPersistence = () => {
    if (authLoading || preferenceHydration?.storageKey !== currentStorageKey)
      return;
    if (preferenceHydration.status === "failed") {
      setLoadAttempt((attempt) => attempt + 1);
    } else if (preferenceHydration.status === "ready") {
      setSaveAttempt((attempt) => attempt + 1);
    }
  };

  const persistenceStatus =
    authLoading || preferenceHydration?.storageKey !== currentStorageKey
      ? null
      : preferenceHydration.status === "loading"
        ? {
            message:
              "Loading saved symbols. Changes stay in this session until preferences load.",
            canRetry: false,
            retrying: true,
          }
        : preferenceHydration.status === "failed"
          ? {
              message:
                "Saved symbols could not be loaded. Changes stay in this session until you retry.",
              canRetry: true,
              retrying: false,
            }
          : remoteSaveFailed
            ? {
                message: localSaveFailed
                  ? "Your symbols could not be synced. Changes stay in this session."
                  : "Your symbols could not be synced. This workspace is saved in this browser.",
                canRetry: true,
                retrying: false,
              }
            : localSaveFailed
              ? {
                  message:
                    "This workspace could not be saved in this browser. Charts and layout changes stay in this session.",
                  canRetry: true,
                  retrying: false,
                }
              : null;

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
    persistenceStatus,
    symbolOptions,
    pending,
    rangeError,
    focusedCard,
    getCardProps,
    actions: {
      applyDraft,
      retryPersistence,
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
