import React from "react";
import Sidebar from "@/components/sidebar";
import { useAuth } from "@/features/auth";
import { METRIC_REGISTRY } from "../data/metricRegistry";
import { PortfolioCommandBar } from "../components/PortfolioCommandBar";
import { PortfolioMetricCard } from "../components/PortfolioMetricCard";
import { PortfolioObservation } from "../components/PortfolioObservation";
import { usePortfolioWorkspaceController } from "../hooks/usePortfolioWorkspaceController";
import { formatPortfolioDate } from "../state/workspaceSelectors";
import styles from "../styles/PortfolioWorkspaceShell.module.css";

export const PortfolioScreen = () => {
  const { user, loading: authLoading } = useAuth();
  const {
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
    actions,
  } = usePortfolioWorkspaceController({
    userId: user?.id,
    authLoading,
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
            variant={index === 0 ? "hero" : index < 3 ? "standard" : "compact"}
            {...getCardProps(card.id)}
          />
        </div>
      ))}
    </section>
  );

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
                  onClick={actions.showBoard}
                >
                  Board
                </button>
                <button
                  type="button"
                  aria-pressed={workspace.view.mode === "focus"}
                  onClick={actions.showFocus}
                >
                  Focus
                </button>
                <button
                  type="button"
                  aria-pressed={workspace.view.mode === "observation"}
                  onClick={actions.showObservation}
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
              onApply={actions.applyDraft}
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
                  {formatPortfolioDate(workspace.globalInputs.startDate)} →{" "}
                  {formatPortfolioDate(workspace.globalInputs.endDate)}
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
                  <button type="button" onClick={actions.showBoard}>
                    ← Back to Board
                  </button>
                  <span>Esc returns without changing the deck</span>
                </div>
                <PortfolioMetricCard
                  card={focusedCard}
                  variant="focus"
                  {...getCardProps(focusedCard.id)}
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
                      onClick={() => actions.focusCard(card.id)}
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
          onDone={actions.showBoard}
          onArrange={actions.arrangeObserver}
          onWindowChange={actions.updateObserverWindow}
          onWindowVisibility={actions.setObserverWindowVisibility}
          onMetricChange={actions.updateCardMetric}
          onOverride={actions.overrideCard}
          onResetInputs={actions.resetCardInputs}
          onFocus={actions.focusCard}
          onPromote={actions.promoteCard}
          onDuplicate={actions.duplicateCard}
          onDelete={actions.deleteCard}
        />
      )}

      <div className={styles.srLive} aria-live="polite">
        {announcement}
      </div>
    </div>
  );
};
