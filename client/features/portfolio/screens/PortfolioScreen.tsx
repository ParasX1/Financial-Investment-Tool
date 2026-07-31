import React, { useCallback, useEffect, useMemo, useState } from "react";
import Sidebar from "@/components/sidebar";
import { useAuth } from "@/components/authContext";
import {
  loadPortfolioConfig,
  savePortfolioConfig,
} from "../data/portfolioPrefs";
import { validateAnalysisRange } from "../lib/portfolioAnalytics";
import {
  createDefaultWorkspace,
  migrateWorkspaceState,
  portfolioWorkspaceReducer,
} from "../lib/workspaceModel";
import type {
  PortfolioAnalysisInputs,
  PortfolioMetricType,
  PortfolioObserverWindow,
  PortfolioWorkspaceState,
} from "../types";
import { METRIC_REGISTRY } from "../data/metricRegistry";
import { PortfolioCommandBar } from "../components/PortfolioCommandBar";
import { PortfolioMetricCard } from "../components/PortfolioMetricCard";
import { PortfolioObservation } from "../components/PortfolioObservation";
import styles from "../styles/PortfolioTraderWorkspace.module.css";

const STORAGE_VERSION = 3;
const SYMBOL_OPTIONS = [
  "AAPL",
  "MSFT",
  "NVDA",
  "GOOGL",
  "AMZN",
  "META",
  "TSLA",
  "JPM",
  "V",
  "BAC",
  "WMT",
  "KO",
  "DIS",
  "PFE",
  "INTC",
  "ORCL",
  "CRM",
  "ADBE",
  "CSCO",
  "CBA.AX",
  "BHP.AX",
];

const localDate = (date: Date) => {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
};

const storageKey = (userId?: string) =>
  `fit.portfolioWorkspace.v${STORAGE_VERSION}.${userId ?? "guest"}`;

const candidateStorageKeys = (userId?: string) => [
  storageKey(userId),
  `fit.portfolioWorkspace.v2.${userId ?? "guest"}`,
  `fit.dashboardState.v1.${userId ?? "guest"}`,
  `fit.portfolioBoard.v3.${userId ?? "guest"}`,
];

const readLocalWorkspace = (userId: string | undefined, today: string) => {
  if (typeof window === "undefined") return null;
  for (const key of candidateStorageKeys(userId)) {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw) return migrateWorkspaceState(JSON.parse(raw), today);
    } catch {
      // Preserve the old value for recovery and try the next known schema.
    }
  }
  return null;
};

const formatDate = (value: string) => {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en-AU", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(date);
};

export const PortfolioScreen = () => {
  const { user, loading: authLoading } = useAuth();
  const today = localDate(new Date());
  const [workspace, setWorkspace] = useState<PortfolioWorkspaceState>(() =>
    createDefaultWorkspace(today),
  );
  const [draftSymbols, setDraftSymbols] = useState<string[]>([]);
  const [draftInputs, setDraftInputs] = useState<PortfolioAnalysisInputs>(
    workspace.globalInputs,
  );
  const [preferencesReady, setPreferencesReady] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const userId = user?.id;

  const dispatch = useCallback(
    (action: Parameters<typeof portfolioWorkspaceReducer>[1]) => {
      setWorkspace((current) => portfolioWorkspaceReducer(current, action));
    },
    [],
  );

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;
    const hydrate = async () => {
      const local = readLocalWorkspace(userId, today);
      if (local) {
        if (cancelled) return;
        setWorkspace(local);
        setDraftSymbols(local.symbols);
        setDraftInputs(local.globalInputs);
        setPreferencesReady(true);
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
      if (cancelled) return;
      setWorkspace(hydrated);
      setDraftSymbols(hydrated.symbols);
      setDraftInputs(hydrated.globalInputs);
      setPreferencesReady(true);
    };
    hydrate();
    return () => {
      cancelled = true;
    };
  }, [authLoading, today, userId]);

  useEffect(() => {
    if (!preferencesReady || typeof window === "undefined") return;
    const timer = window.setTimeout(() => {
      window.localStorage.setItem(storageKey(userId), JSON.stringify(workspace));
    }, 220);
    return () => window.clearTimeout(timer);
  }, [preferencesReady, userId, workspace]);

  useEffect(() => {
    if (!preferencesReady || !userId) return;
    const timer = window.setTimeout(() => {
      savePortfolioConfig(userId, { tags: workspace.symbols }).catch(
        () => undefined,
      );
    }, 500);
    return () => window.clearTimeout(timer);
  }, [preferencesReady, userId, workspace.symbols]);

  const activeFocusId =
    workspace.view.mode === "focus"
      ? workspace.view.cardId
      : workspace.cards[0]?.id;

  useEffect(() => {
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
      } else if (event.key.toLowerCase() === "f" && activeFocusId) {
        dispatch({
          type: "setView",
          view: { mode: "focus", cardId: activeFocusId },
        });
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeFocusId, dispatch, workspace.view.mode]);

  const symbolOptions = useMemo(
    () => Array.from(new Set([...draftSymbols, ...SYMBOL_OPTIONS])),
    [draftSymbols],
  );
  const pending =
    JSON.stringify(draftSymbols) !== JSON.stringify(workspace.symbols) ||
    JSON.stringify(draftInputs) !== JSON.stringify(workspace.globalInputs);
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
      return portfolioWorkspaceReducer(withSymbols, {
        type: "updateGlobalInputs",
        patch: draftInputs,
      });
    });
    setAnnouncement(
      `Analysis applied to ${draftSymbols.length} ${
        draftSymbols.length === 1 ? "symbol" : "symbols"
      }`,
    );
  };

  const updateCardMetric = (
    cardId: string,
    metricType: PortfolioMetricType,
  ) => dispatch({ type: "setCardMetric", cardId, metricType });
  const overrideCard = (
    cardId: string,
    patch: Partial<PortfolioAnalysisInputs>,
  ) => dispatch({ type: "overrideCardInputs", cardId, patch });
  const focusCard = (cardId: string) => {
    dispatch({ type: "setView", view: { mode: "focus", cardId } });
    setAnnouncement(
      `${METRIC_REGISTRY[
        workspace.cards.find((card) => card.id === cardId)?.metricType ??
          workspace.cards[0].metricType
      ].label} opened in Focus`,
    );
  };

  const commonCardProps = (cardId: string) => ({
    symbols: workspace.symbols,
    globalInputs: workspace.globalInputs,
    today,
    cardCount: workspace.cards.length,
    onMetricChange: (metricType: PortfolioMetricType) =>
      updateCardMetric(cardId, metricType),
    onOverride: (patch: Partial<PortfolioAnalysisInputs>) =>
      overrideCard(cardId, patch),
    onResetInputs: () => dispatch({ type: "resetCardInputs", cardId }),
    onFocus: () => focusCard(cardId),
    onPromote: () => dispatch({ type: "promoteCard", cardId }),
    onDuplicate: () => dispatch({ type: "duplicateCard", cardId }),
    onDelete: () => dispatch({ type: "deleteCard", cardId }),
  });

  const renderBoard = () => (
    <section className={styles.board} aria-label="Multi-metric Portfolio board">
      {workspace.cards.map((card, index) => (
        <div
          key={card.id}
          className={`${styles.boardSlot} ${styles[`boardSlot_${index}`]}`}
        >
          <PortfolioMetricCard
            card={card}
            variant={
              index === 0 ? "hero" : index < 3 ? "standard" : "compact"
            }
            {...commonCardProps(card.id)}
          />
        </div>
      ))}
    </section>
  );

  const focusedCard =
    workspace.cards.find((card) => card.id === activeFocusId) ??
    workspace.cards[0];

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <Sidebar />
        <main id="main-content" tabIndex={-1} className={styles.main}>
          <div className={styles.content}>
            <header className={styles.traderHeader}>
              <div>
                <p className={styles.eyebrow}>Portfolio · research desk</p>
                <h1>Scan broadly. Investigate deeply.</h1>
                <p>
                  One basket, six simultaneous lenses, and no lost context
                  between Board, Focus, and Observation.
                </p>
              </div>
              <div className={styles.modeSwitcher} aria-label="Workspace mode">
                <button
                  type="button"
                  aria-pressed={workspace.view.mode === "board"}
                  onClick={() =>
                    dispatch({ type: "setView", view: { mode: "board" } })
                  }
                >
                  Board
                </button>
                <button
                  type="button"
                  aria-pressed={workspace.view.mode === "focus"}
                  onClick={() =>
                    focusedCard &&
                    dispatch({
                      type: "setView",
                      view: { mode: "focus", cardId: focusedCard.id },
                    })
                  }
                >
                  Focus
                </button>
                <button
                  type="button"
                  aria-pressed={workspace.view.mode === "observation"}
                  onClick={() =>
                    dispatch({
                      type: "setView",
                      view: { mode: "observation" },
                    })
                  }
                >
                  Observation
                </button>
              </div>
            </header>

            <PortfolioCommandBar
              symbols={draftSymbols}
              symbolOptions={symbolOptions}
              inputs={draftInputs}
              today={today}
              pending={pending}
              validationError={rangeError}
              onSymbolsChange={setDraftSymbols}
              onInputsChange={setDraftInputs}
              onApply={applyDraft}
            />

            <section
              className={styles.summaryStrip}
              aria-label="Applied research context"
            >
              <div className={styles.summaryItem}>
                <span>Applied universe</span>
                <strong>
                  {workspace.symbols.length
                    ? workspace.symbols.join(" · ")
                    : "Waiting for symbols"}
                </strong>
              </div>
              <div className={styles.summaryItem}>
                <span>Sample</span>
                <strong>
                  {formatDate(workspace.globalInputs.startDate)} →{" "}
                  {formatDate(workspace.globalInputs.endDate)}
                </strong>
              </div>
              <div className={styles.summaryItem}>
                <span>Charts</span>
                <strong>{workspace.cards.length} / 6 active</strong>
              </div>
              <div className={styles.summaryItem}>
                <span>Freshness</span>
                <strong>Historical · on demand</strong>
              </div>
            </section>

            {workspace.view.mode === "board" && renderBoard()}

            {workspace.view.mode === "focus" && focusedCard && (
              <section className={styles.focusView} aria-label="Focus mode">
                <div className={styles.focusToolbar}>
                  <button
                    type="button"
                    onClick={() =>
                      dispatch({ type: "setView", view: { mode: "board" } })
                    }
                  >
                    ← Back to Board
                  </button>
                  <span>Esc returns without changing the deck</span>
                </div>
                <PortfolioMetricCard
                  card={focusedCard}
                  variant="focus"
                  {...commonCardProps(focusedCard.id)}
                />
                <nav
                  className={styles.focusFilmstrip}
                  aria-label="Other Portfolio charts"
                >
                  {workspace.cards.map((card, index) => (
                    <button
                      key={card.id}
                      type="button"
                      aria-current={card.id === focusedCard.id}
                      onClick={() => focusCard(card.id)}
                    >
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      <strong>
                        {METRIC_REGISTRY[card.metricType].shortLabel}
                      </strong>
                      <small>
                        {Object.keys(card.overrides).length
                          ? "Custom"
                          : "Linked"}
                      </small>
                    </button>
                  ))}
                </nav>
              </section>
            )}
          </div>
        </main>
      </div>

      {workspace.view.mode === "observation" && (
        <PortfolioObservation
          cards={workspace.cards}
          symbols={workspace.symbols}
          globalInputs={workspace.globalInputs}
          layout={workspace.observerLayout}
          today={today}
          onDone={() =>
            dispatch({ type: "setView", view: { mode: "board" } })
          }
          onArrange={() =>
            dispatch({
              type: "arrangeObserver",
              width: window.innerWidth,
              height: window.innerHeight - 58,
            })
          }
          onWindowChange={(
            cardId: string,
            patch: Partial<PortfolioObserverWindow>,
          ) => dispatch({ type: "updateObserverWindow", cardId, patch })}
          onWindowVisibility={(cardId, visible) =>
            dispatch({
              type: "setObserverWindowVisibility",
              cardId,
              visible,
            })
          }
          onMetricChange={updateCardMetric}
          onOverride={overrideCard}
          onResetInputs={(cardId) =>
            dispatch({ type: "resetCardInputs", cardId })
          }
          onFocus={focusCard}
          onPromote={(cardId) =>
            dispatch({ type: "promoteCard", cardId })
          }
          onDuplicate={(cardId) =>
            dispatch({ type: "duplicateCard", cardId })
          }
          onDelete={(cardId) =>
            dispatch({ type: "deleteCard", cardId })
          }
        />
      )}

      <div className={styles.srLive} aria-live="polite">
        {announcement}
      </div>
    </div>
  );
};
