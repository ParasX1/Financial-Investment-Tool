import React from "react";
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
import styles from "../styles/PortfolioTraderWorkspace.module.css";

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
  globalInputs,
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
  globalInputs: PortfolioAnalysisInputs;
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
  const canvasRef = React.useRef<HTMLDivElement>(null);
  const layoutRef = React.useRef(layout);
  const onWindowChangeRef = React.useRef(onWindowChange);
  layoutRef.current = layout;
  onWindowChangeRef.current = onWindowChange;
  const visibleCards = cards.filter((card) => layout[card.id]?.visible);
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
    reconcileWindows();
  }, [layout, onWindowChange, reconcileWindows]);

  useIsomorphicLayoutEffect(() => {
    const canvas = canvasRef.current;
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
  }, [reconcileWindows]);

  const bringForward = (cardId: string) => {
    if (layout[cardId]?.z === maximumZ) return;
    onWindowChange(cardId, { z: maximumZ + 1 });
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

  return (
    <div
      className={styles.observation}
      role="dialog"
      aria-modal="true"
      aria-label="Portfolio Observation mode"
    >
      <header className={styles.observationToolbar}>
        <div>
          <span className={styles.observationPulse} aria-hidden="true" />
          <strong>Observation</strong>
          <p>Historical research desk · not a live feed</p>
        </div>
        <div className={styles.observationActions}>
          <button type="button" onClick={onArrange}>
            Auto arrange
          </button>
          <button
            type="button"
            onClick={() =>
              cards.forEach((card) => onWindowVisibility(card.id, true))
            }
            disabled={visibleCards.length === cards.length}
          >
            Restore hidden
          </button>
          <button type="button" className={styles.doneButton} onClick={onDone}>
            Done
          </button>
        </div>
      </header>

      <div ref={canvasRef} className={styles.observationCanvas}>
        {!visibleCards.length && (
          <div className={styles.observationEmpty}>
            <strong>No visible windows</strong>
            <p>Restore the board cards or return to the Board.</p>
            <button
              type="button"
              onClick={() =>
                cards.forEach((card) => onWindowVisibility(card.id, true))
              }
            >
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
              aria-label={`${METRIC_REGISTRY[card.metricType].label} window`}
            >
              <div
                className={styles.observationHandle}
                onPointerDown={(event) =>
                  startPointerAction(event, card.id, "drag")
                }
              >
                <span>
                  Drag · {METRIC_REGISTRY[card.metricType].shortLabel}
                </span>
                <button
                  type="button"
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
                  globalInputs={globalInputs}
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
                onPointerDown={(event) =>
                  startPointerAction(event, card.id, "resize")
                }
              />
            </section>
          );
        })}
      </div>
    </div>
  );
};
