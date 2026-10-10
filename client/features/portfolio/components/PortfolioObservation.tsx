import React from "react";
import Modal from "@mui/material/Modal";
import type {
  PortfolioAnalysisInputs,
  PortfolioMetricCard,
  PortfolioMetricType,
  PortfolioObserverLayout,
  PortfolioObserverWindow,
} from "../types";
import { METRIC_REGISTRY } from "../data/metricRegistry";
import { PortfolioMetricCard as MetricCard } from "./PortfolioMetricCard";
import {
  constrainObservationDrag,
  constrainObservationResize,
  constrainObservationWindow,
} from "./portfolioObservationGeometry";
import { isBoardVisibleCardIndex } from "../state";
import styles from "../styles/PortfolioObservation.module.css";
import workspaceStyles from "../styles/PortfolioWorkspaceShell.module.css";

const OBSERVATION_DESKTOP_MINIMUM_WIDTH = 721;
const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? React.useEffect : React.useLayoutEffect;

const hasEqualGeometry = (
  current: PortfolioObserverWindow,
  next: Pick<PortfolioObserverWindow, "x" | "y" | "width" | "height">,
) =>
  current.x === next.x &&
  current.y === next.y &&
  current.width === next.width &&
  current.height === next.height;

export const PortfolioObservation = ({
  cards,
  symbols,
  draftSymbolCount,
  globalInputs,
  hasPendingDraft,
  layout,
  today,
  onDone,
  onArrange,
  onWindowChange,
  onWindowVisibility,
  onMetricChange,
  onOverride,
  onResetInputs,
  onFocus,
  onPromote,
  onDuplicate,
  onDelete,
}: {
  cards: PortfolioMetricCard[];
  symbols: string[];
  draftSymbolCount: number;
  globalInputs: PortfolioAnalysisInputs;
  hasPendingDraft: boolean;
  layout: PortfolioObserverLayout;
  today: string;
  onDone: () => void;
  onArrange: () => void;
  onWindowChange: (
    cardId: string,
    patch: Partial<PortfolioObserverWindow>,
  ) => void;
  onWindowVisibility: (cardId: string, visible: boolean) => void;
  onMetricChange: (cardId: string, metricType: PortfolioMetricType) => void;
  onOverride: (cardId: string, patch: Partial<PortfolioAnalysisInputs>) => void;
  onResetInputs: (cardId: string) => void;
  onFocus: (cardId: string) => void;
  onPromote: (cardId: string) => void;
  onDuplicate: (cardId: string) => void;
  onDelete: (cardId: string) => void;
}) => {
  const keyboardHelpId = React.useId();
  const canvasRef = React.useRef<HTMLDivElement | null>(null);
  const [canvasNode, setCanvasNode] = React.useState<HTMLDivElement | null>(
    null,
  );
  const attachCanvas = React.useCallback((node: HTMLDivElement | null) => {
    canvasRef.current = node;
    setCanvasNode(node);
  }, []);
  const layoutRef = React.useRef(layout);
  const onWindowChangeRef = React.useRef(onWindowChange);
  layoutRef.current = layout;
  onWindowChangeRef.current = onWindowChange;
  const visibleCards = cards.filter((card) => layout[card.id]?.visible);
  const boardVisibilityTargets = cards.map((card, index) => ({
    card,
    visible: isBoardVisibleCardIndex(index),
  }));
  const hasRestorableBoardVisibility = boardVisibilityTargets.some(
    ({ card, visible }) => (layout[card.id]?.visible ?? false) !== visible,
  );
  const maximumZ = Math.max(
    10,
    ...Object.values(layout).map((windowState) => windowState.z),
  );

  const reconcileWindows = React.useCallback(() => {
    const canvas = canvasRef.current;
    if (
      !canvas ||
      typeof window === "undefined" ||
      window.innerWidth < OBSERVATION_DESKTOP_MINIMUM_WIDTH
    ) {
      return;
    }

    const canvasRect = canvas.getBoundingClientRect();
    if (canvasRect.width <= 0 || canvasRect.height <= 0) return;

    Object.entries(layoutRef.current).forEach(([cardId, windowState]) => {
      const constrained = constrainObservationWindow(windowState, canvasRect);
      if (hasEqualGeometry(windowState, constrained)) return;
      onWindowChangeRef.current(cardId, constrained);
    });
  }, []);

  useIsomorphicLayoutEffect(() => {
    if (canvasNode) reconcileWindows();
  }, [canvasNode, layout, onWindowChange, reconcileWindows]);

  useIsomorphicLayoutEffect(() => {
    const canvas = canvasNode;
    if (!canvas || typeof window === "undefined") return;

    const resizeObserver =
      typeof ResizeObserver === "undefined"
        ? undefined
        : new ResizeObserver(reconcileWindows);
    resizeObserver?.observe(canvas);
    window.addEventListener("resize", reconcileWindows);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", reconcileWindows);
    };
  }, [canvasNode, reconcileWindows]);

  const bringForward = (cardId: string) => {
    if (layout[cardId]?.z === maximumZ) return;
    onWindowChange(cardId, { z: maximumZ + 1 });
  };

  const restoreBoardVisibleWindows = () => {
    boardVisibilityTargets.forEach(({ card, visible }) => {
      if ((layout[card.id]?.visible ?? false) === visible) return;
      onWindowVisibility(card.id, visible);
    });
  };

  const startPointerAction = (
    event: React.PointerEvent,
    cardId: string,
    mode: "drag" | "resize",
  ) => {
    if (event.button !== 0 || window.innerWidth <= 720) return;
    const canvas = canvasRef.current;
    const windowState = layout[cardId];
    if (!canvas || !windowState) return;
    event.preventDefault();
    event.stopPropagation();
    bringForward(cardId);
    const pointerId = event.pointerId;
    const pointerTarget = event.currentTarget;
    pointerTarget.setPointerCapture(pointerId);
    const startX = event.clientX;
    const startY = event.clientY;
    const origin = { ...windowState };
    const onMove = (moveEvent: PointerEvent) => {
      if (moveEvent.pointerId !== pointerId) return;
      const canvasRect = canvas.getBoundingClientRect();
      const delta = {
        x: moveEvent.clientX - startX,
        y: moveEvent.clientY - startY,
      };
      if (mode === "drag") {
        onWindowChange(
          cardId,
          constrainObservationDrag(origin, delta, canvasRect),
        );
      } else {
        onWindowChange(
          cardId,
          constrainObservationResize(origin, delta, canvasRect),
        );
      }
    };
    const onUp = (upEvent: PointerEvent) => {
      if (upEvent.pointerId !== pointerId) return;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      if (pointerTarget.hasPointerCapture(pointerId)) {
        pointerTarget.releasePointerCapture(pointerId);
      }
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  };

  const changeWindowWithKeyboard = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    cardId: string,
    mode: "drag" | "resize",
  ) => {
    if (
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.nativeEvent?.isComposing ||
      window.innerWidth < OBSERVATION_DESKTOP_MINIMUM_WIDTH
    ) {
      return;
    }
    const step = event.shiftKey ? 50 : 10;
    const deltas: Record<string, { x: number; y: number }> = {
      ArrowLeft: { x: -step, y: 0 },
      ArrowRight: { x: step, y: 0 },
      ArrowUp: { x: 0, y: -step },
      ArrowDown: { x: 0, y: step },
    };
    const delta = deltas[event.key];
    const canvas = canvasRef.current;
    const windowState = layout[cardId];
    if (!delta || !canvas || !windowState) return;

    event.preventDefault();
    event.stopPropagation();
    bringForward(cardId);
    const canvasRect = canvas.getBoundingClientRect();
    const constrain =
      mode === "drag" ? constrainObservationDrag : constrainObservationResize;
    onWindowChange(cardId, constrain(windowState, delta, canvasRect));
  };

  const wrapVisibleTabBoundary = (
    event: React.KeyboardEvent<HTMLDivElement>,
  ) => {
    if (event.key !== "Tab" || event.defaultPrevented) return;
    // MUI 5's focus trap includes CSS-hidden resize controls and controls inside
    // closed details. Wrap only the visible edges here; Modal still owns focus
    // enforcement, restoration, Escape, and hiding the background from AT.
    const controls = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>(
        "button, input, select, textarea, a[href], summary, [tabindex]",
      ),
    ).filter((node) => {
      if (
        node.tabIndex < 0 ||
        node.matches(":disabled") ||
        node.getClientRects().length === 0
      ) {
        return false;
      }
      // Closed details can still expose descendant layout boxes in Chromium,
      // but only their summary participates in native keyboard focus.
      for (
        let details = node.closest<HTMLDetailsElement>("details:not([open])");
        details;
        details =
          details.parentElement?.closest<HTMLDetailsElement>(
            "details:not([open])",
          ) ?? null
      ) {
        if (!details.querySelector(":scope > summary")?.contains(node))
          return false;
      }
      return true;
    });
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (
      (event.shiftKey && event.target === first) ||
      (!event.shiftKey && event.target === last) ||
      event.target === event.currentTarget
    ) {
      event.preventDefault();
      (event.shiftKey ? last : first)?.focus();
    }
  };

  return (
    <Modal open onClose={onDone} hideBackdrop style={{ zIndex: 1600 }}>
      <div
        className={`${workspaceStyles.page} ${styles.observation}`}
        role="dialog"
        aria-modal="true"
        aria-label="Portfolio Observation mode"
        tabIndex={-1}
        onKeyDown={wrapVisibleTabBoundary}
      >
        <header className={styles.observationToolbar}>
          <div>
            <span className={styles.observationPulse} aria-hidden="true" />
            <strong>Observation</strong>
            <p>
              Historical research desk · not a live feed
              <span
                id={keyboardHelpId}
                className={styles.observationKeyboardHelp}
              >
                Focus Move or Resize, then use arrow keys for 10 px steps. Hold
                Shift for 50 px.
              </span>
            </p>
          </div>
          <div className={styles.observationActions}>
            <button type="button" onClick={onArrange}>
              Auto arrange
            </button>
            <button
              type="button"
              onClick={restoreBoardVisibleWindows}
              disabled={!hasRestorableBoardVisibility}
            >
              Restore hidden
            </button>
            <button
              type="button"
              className={styles.doneButton}
              onClick={onDone}
              autoFocus
            >
              Done
            </button>
          </div>
        </header>

        <div ref={attachCanvas} className={styles.observationCanvas}>
          {!visibleCards.length && (
            <div className={styles.observationEmpty}>
              <strong>No visible windows</strong>
              <p>Restore the board cards or return to the Board.</p>
              <button type="button" onClick={restoreBoardVisibleWindows}>
                Restore board cards
              </button>
            </div>
          )}
          {visibleCards.map((card) => {
            const windowState = layout[card.id];
            return (
              <section
                key={card.id}
                className={styles.observationWindow}
                style={{
                  left: windowState.x,
                  top: windowState.y,
                  width: windowState.width,
                  height: windowState.height,
                  zIndex: windowState.z,
                }}
                onPointerDown={() => bringForward(card.id)}
                onFocusCapture={() => bringForward(card.id)}
                aria-label={`${METRIC_REGISTRY[card.metricType].label} window`}
              >
                <div
                  className={styles.observationHandle}
                  onPointerDown={(event) =>
                    startPointerAction(event, card.id, "drag")
                  }
                >
                  <button
                    type="button"
                    className={styles.observationMove}
                    aria-label={`Move ${METRIC_REGISTRY[card.metricType].label} window`}
                    aria-describedby={keyboardHelpId}
                    title="Drag to move, or use arrow keys when focused"
                    onKeyDown={(event) =>
                      changeWindowWithKeyboard(event, card.id, "drag")
                    }
                  >
                    Move · {METRIC_REGISTRY[card.metricType].shortLabel}
                  </button>
                  <span
                    className={styles.observationMobileLabel}
                    aria-hidden="true"
                  >
                    {METRIC_REGISTRY[card.metricType].shortLabel}
                  </span>
                  <button
                    type="button"
                    className={styles.observationHide}
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={() => onWindowVisibility(card.id, false)}
                    aria-label={`Hide ${
                      METRIC_REGISTRY[card.metricType].label
                    } window`}
                  >
                    ×
                  </button>
                </div>
                <div className={styles.observationCardBody}>
                  <MetricCard
                    card={card}
                    symbols={symbols}
                    draftSymbolCount={draftSymbolCount}
                    globalInputs={globalInputs}
                    hasPendingDraft={hasPendingDraft}
                    today={today}
                    variant="observer"
                    cardCount={cards.length}
                    onMetricChange={(metricType) =>
                      onMetricChange(card.id, metricType)
                    }
                    onOverride={(patch) => onOverride(card.id, patch)}
                    onResetInputs={() => onResetInputs(card.id)}
                    onFocus={() => onFocus(card.id)}
                    onPromote={() => onPromote(card.id)}
                    onDuplicate={() => onDuplicate(card.id)}
                    onDelete={() => onDelete(card.id)}
                  />
                </div>
                <button
                  type="button"
                  className={styles.observationResize}
                  aria-label={`Resize ${
                    METRIC_REGISTRY[card.metricType].label
                  } window`}
                  aria-describedby={keyboardHelpId}
                  title="Drag to resize, or use arrow keys when focused"
                  onKeyDown={(event) =>
                    changeWindowWithKeyboard(event, card.id, "resize")
                  }
                  onPointerDown={(event) =>
                    startPointerAction(event, card.id, "resize")
                  }
                />
              </section>
            );
          })}
        </div>
      </div>
    </Modal>
  );
};
