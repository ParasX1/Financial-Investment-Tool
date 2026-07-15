import * as React from "react";
import Link from "next/link";
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from "@mui/material";
import ModalLogin from "@/components/Modal/ModalLogin";
import ModalSignUp from "@/components/Modal/ModalSignUp";
import { FitPageHeader } from "@/components/shared/FitPageHeader";
import { FitPageShell } from "@/components/shared/FitPageShell";
import {
  FIT_CONTENT_MAX_WIDTH_PX,
  FIT_FOCUS_VISIBLE,
  cn,
} from "@/components/shared/uiPrimitives";
import { WATCHLIST_LIMIT, WATCHLIST_NOTE_LIMIT } from "../constants";
import {
  selectWatchlistItems,
  validateWatchlistDraft,
} from "../lib/watchlistState";
import { getSelectedSearchSymbol } from "../lib/watchlistSearch";
import type {
  WatchlistDraft,
  WatchlistDraftErrors,
  WatchlistItem,
  WatchlistSort,
} from "../types";
import { useWatchlistController } from "../hooks/useWatchlistController";
import { useWatchlistQuotes } from "../hooks/useWatchlistQuotes";
import { useWatchlistSymbolSearch } from "../hooks/useWatchlistSymbolSearch";
import { WatchlistRow } from "./WatchlistRow";
import { WatchlistMarketMonitor } from "./WatchlistMarketMonitor";
import {
  WatchlistEmptyState,
  WatchlistLoadError,
  WatchlistLoadingState,
  WatchlistSignedOut,
} from "./WatchlistStates";
import styles from "../styles/watchlist.module.css";

const sortOptions: Array<{ label: string; value: WatchlistSort }> = [
  { label: "Custom order", value: "custom" },
  { label: "Symbol A–Z", value: "symbol-asc" },
  { label: "Company A–Z", value: "name-asc" },
  { label: "Biggest gain", value: "change-desc" },
  { label: "Biggest fall", value: "change-asc" },
  { label: "Recently added", value: "added-desc" },
];

function formatRefreshTime(value: Date | null) {
  if (!value) return "Waiting for market data…";
  return `Auto-updating · Updated ${new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  }).format(value)}`;
}

export function WatchlistMain() {
  const watchlist = useWatchlistController();
  const [showLogin, setShowLogin] = React.useState(false);
  const [showSignUp, setShowSignUp] = React.useState(false);
  const [addQuery, setAddQuery] = React.useState("");
  const [activeSuggestion, setActiveSuggestion] = React.useState(-1);
  const [suggestionsDismissed, setSuggestionsDismissed] = React.useState(false);
  const [listFilter, setListFilter] = React.useState("");
  const [sort, setSort] = React.useState<WatchlistSort>("custom");
  const [editingItem, setEditingItem] = React.useState<WatchlistItem | null>(null);
  const [draft, setDraft] = React.useState<WatchlistDraft>({ note: "", targetPrice: "" });
  const [draftErrors, setDraftErrors] = React.useState<WatchlistDraftErrors>({});
  const [pendingRemove, setPendingRemove] = React.useState<WatchlistItem | null>(null);
  const [monitoredSymbol, setMonitoredSymbol] = React.useState<string | null>(null);
  const [monitorOpen, setMonitorOpen] = React.useState(true);
  const symbolSearch = useWatchlistSymbolSearch(addQuery);
  const quoteState = useWatchlistQuotes(watchlist.items.map((item) => item.symbol));

  const visibleItems = React.useMemo(
    () => selectWatchlistItems({
      items: watchlist.items,
      quotes: quoteState.quotes,
      search: listFilter,
      sort,
    }),
    [listFilter, quoteState.quotes, sort, watchlist.items],
  );

  React.useEffect(() => {
    setActiveSuggestion(symbolSearch.results.length ? 0 : -1);
  }, [symbolSearch.results]);

  React.useEffect(() => {
    setMonitoredSymbol((current) => {
      if (!watchlist.items.length) return null;
      return current && watchlist.items.some((item) => item.symbol === current)
        ? current
        : watchlist.items[0]!.symbol;
    });
  }, [watchlist.items]);

  const monitoredItem = React.useMemo(
    () => watchlist.items.find((item) => item.symbol === monitoredSymbol) ?? null,
    [monitoredSymbol, watchlist.items],
  );

  const addSymbol = React.useCallback(async (symbol: string) => {
    const added = await watchlist.addItem(symbol);
    if (added) {
      setAddQuery("");
      setActiveSuggestion(-1);
      setSuggestionsDismissed(false);
    }
  }, [watchlist]);

  const handleAddSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const symbol = getSelectedSearchSymbol(
      symbolSearch.results,
      activeSuggestion,
    );
    if (symbol) void addSymbol(symbol);
  };

  const handleAddKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      setActiveSuggestion(-1);
      setSuggestionsDismissed(true);
      return;
    }
    if (!symbolSearch.results.length) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSuggestionsDismissed(false);
      setActiveSuggestion((index) => Math.min(index + 1, symbolSearch.results.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setSuggestionsDismissed(false);
      setActiveSuggestion((index) => Math.max(index - 1, 0));
    }
  };

  const openEdit = (item: WatchlistItem) => {
    watchlist.clearFeedback();
    setEditingItem(item);
    setDraft({
      note: item.note ?? "",
      targetPrice: item.targetPrice === null ? "" : String(item.targetPrice),
    });
    setDraftErrors({});
  };

  const saveDraft = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingItem) return;
    const errors = validateWatchlistDraft(draft);
    setDraftErrors(errors);
    if (Object.keys(errors).length) return;

    const saved = await watchlist.updateItem(editingItem.symbol, {
      note: draft.note.trim() || null,
      targetPrice: draft.targetPrice.trim() ? Number(draft.targetPrice) : null,
    });
    if (saved) setEditingItem(null);
  };

  const confirmRemove = async () => {
    if (!pendingRemove) return;
    const removed = await watchlist.removeItem(pendingRemove.symbol);
    if (removed) setPendingRemove(null);
  };

  const listReady = watchlist.authenticated && !watchlist.authLoading && !watchlist.loading && !watchlist.loadError;
  const busy = watchlist.busyAction !== null;
  const selectedSearchSymbol = getSelectedSearchSymbol(
    symbolSearch.results,
    activeSuggestion,
  );
  const reorderEnabled = sort === "custom" && !listFilter.trim();

  return (
    <FitPageShell skipLabel="Skip to watchlist" skipTargetId="watchlist-main">
      <main id="watchlist-main" tabIndex={-1} className={styles.page}>
        <div className={styles.pageInner} style={{ maxWidth: FIT_CONTENT_MAX_WIDTH_PX }}>
          <div className={styles.headerRow}>
            <FitPageHeader
              className={styles.header}
              title="Watchlist"
              subtitle="Keep a focused list of market ideas, record why they matter, and decide what to research next."
            />
            <Link
              href="/MarketNews?lens=watchlist&sort=watchlist-first"
              className={cn(styles.secondaryButton, styles.newsLink, FIT_FOCUS_VISIBLE)}
            >
              View Watchlist News
            </Link>
          </div>

          {listReady ? (
            <section className={styles.addPanel} aria-labelledby="watchlist-add-title">
              <div className={styles.addCopy}>
                <h2 id="watchlist-add-title" className={styles.panelTitle}>Add a company or ticker</h2>
                <p className={styles.panelCopy}>
                  Use a ticker such as CBA.AX or search by company name. You can save up to {WATCHLIST_LIMIT} research ideas.
                </p>
              </div>
              <form className={styles.addForm} onSubmit={handleAddSubmit}>
                <label className={styles.srOnly} htmlFor="watchlist-symbol-search">Company or ticker</label>
                <div className={styles.comboboxWrap}>
                  <input
                    id="watchlist-symbol-search"
                    name="watchlist-symbol"
                    type="search"
                    autoComplete="off"
                    placeholder="Search company or ticker…"
                    value={addQuery}
                    onChange={(event) => {
                      setAddQuery(event.target.value);
                      setSuggestionsDismissed(false);
                    }}
                    onKeyDown={handleAddKeyDown}
                    role="combobox"
                    aria-autocomplete="list"
                    aria-controls="watchlist-symbol-options"
                    aria-expanded={Boolean(
                      addQuery &&
                        !suggestionsDismissed &&
                        (symbolSearch.loading ||
                          symbolSearch.results.length ||
                          symbolSearch.error ||
                          symbolSearch.hasSearched),
                    )}
                    aria-activedescendant={activeSuggestion >= 0 ? `watchlist-option-${activeSuggestion}` : undefined}
                    className={cn(styles.input, FIT_FOCUS_VISIBLE)}
                    disabled={busy || watchlist.items.length >= WATCHLIST_LIMIT}
                  />
                  {addQuery &&
                  !suggestionsDismissed &&
                  (symbolSearch.loading ||
                    symbolSearch.results.length ||
                    symbolSearch.error ||
                    symbolSearch.hasSearched) ? (
                    <div className={styles.suggestionPopover}>
                      {symbolSearch.loading ? <p className={styles.suggestionStatus}>Searching…</p> : null}
                      {symbolSearch.error ? <p className={styles.searchError} role="status">{symbolSearch.error}</p> : null}
                      {symbolSearch.hasSearched &&
                      !symbolSearch.error &&
                      !symbolSearch.results.length ? (
                        <p className={styles.suggestionStatus} role="status">
                          No matching market symbol found. Try a company name or exchange ticker.
                        </p>
                      ) : null}
                      {symbolSearch.results.length ? (
                        <ul id="watchlist-symbol-options" role="listbox" className={styles.suggestionList}>
                          {symbolSearch.results.map((result, index) => (
                            <li key={result.symbol} role="presentation">
                              <button
                                id={`watchlist-option-${index}`}
                                type="button"
                                role="option"
                                aria-selected={activeSuggestion === index}
                                className={cn(styles.suggestion, activeSuggestion === index && styles.suggestionActive, FIT_FOCUS_VISIBLE)}
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={() => void addSymbol(result.symbol)}
                              >
                                <span><strong>{result.symbol}</strong><small>{result.exchange ?? result.quoteType}</small></span>
                                <span>{result.name}</span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  ) : null}
                </div>
                <button type="submit" className={cn(styles.primaryButton, FIT_FOCUS_VISIBLE)} disabled={!selectedSearchSymbol || symbolSearch.loading || busy || watchlist.items.length >= WATCHLIST_LIMIT}>
                  {watchlist.busyAction === "add"
                    ? "Adding…"
                    : symbolSearch.loading
                      ? "Searching…"
                      : selectedSearchSymbol
                        ? "Add to Watchlist"
                        : "Choose a Result"}
                </button>
              </form>
            </section>
          ) : null}

          {watchlist.feedback ? (
            <div
              className={watchlist.feedback.tone === "error" ? styles.feedbackError : styles.feedbackSuccess}
              role={watchlist.feedback.tone === "error" ? "alert" : "status"}
              aria-live="polite"
            >
              <span>{watchlist.feedback.message}</span>
              <button type="button" onClick={watchlist.clearFeedback} aria-label="Dismiss message">×</button>
            </div>
          ) : null}

          {listReady && monitorOpen && monitoredItem ? (
            <WatchlistMarketMonitor
              item={monitoredItem}
              quote={
                quoteState.loading && !quoteState.quotes[monitoredItem.symbol]
                  ? undefined
                  : quoteState.quotes[monitoredItem.symbol] ?? null
              }
              quoteRefreshing={quoteState.refreshing}
              onClose={() => setMonitorOpen(false)}
              onRefreshQuotes={quoteState.refresh}
            />
          ) : null}

          {watchlist.authLoading ? <WatchlistLoadingState /> : !watchlist.authenticated ? (
            <WatchlistSignedOut onSignIn={() => setShowLogin(true)} onCreateAccount={() => setShowSignUp(true)} />
          ) : watchlist.loading ? <WatchlistLoadingState /> : watchlist.loadError ? (
            <WatchlistLoadError message={watchlist.loadError} onRetry={() => void watchlist.retry()} />
          ) : !watchlist.items.length ? <WatchlistEmptyState /> : (
            <section className={styles.listSection} aria-labelledby="watchlist-list-title">
              <div className={styles.listToolbar}>
                <div>
                  <p className={styles.stateEyebrow}>{watchlist.items.length} of {WATCHLIST_LIMIT} ideas</p>
                  <h2 id="watchlist-list-title" className={styles.panelTitle}>My Research List</h2>
                </div>
                <div className={styles.toolbarControls}>
                  <label>
                    <span>Filter list</span>
                    <input type="search" name="watchlist-filter" autoComplete="off" placeholder="Filter saved ideas…" value={listFilter} onChange={(event) => setListFilter(event.target.value)} className={cn(styles.control, FIT_FOCUS_VISIBLE)} />
                  </label>
                  <label>
                    <span>Sort by</span>
                    <select value={sort} onChange={(event) => setSort(event.target.value as WatchlistSort)} className={cn(styles.control, FIT_FOCUS_VISIBLE)}>
                      {sortOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  </label>
                </div>
              </div>

              <div className={styles.quoteStatus}>
                <span>{quoteState.refreshing ? "Auto-updating · Updating quotes…" : formatRefreshTime(quoteState.lastUpdated)}</span>
                {quoteState.error ? <span className={styles.searchError}>{quoteState.error}</span> : null}
                <button type="button" className={cn(styles.textButton, FIT_FOCUS_VISIBLE)} onClick={quoteState.refresh} disabled={quoteState.loading || quoteState.refreshing}>Refresh Quotes</button>
              </div>

              <div className={styles.listHeader} aria-hidden="true">
                <span>Company</span><span>Market Snapshot</span><span>Research Note</span><span>Actions</span>
              </div>
              <div className={styles.list} aria-busy={quoteState.loading || busy}>
                {visibleItems.length ? visibleItems.map((item) => {
                  const savedIndex = watchlist.items.findIndex((saved) => saved.symbol === item.symbol);
                  return (
                    <WatchlistRow
                      key={item.symbol}
                      item={item}
                      isMonitored={monitorOpen && monitoredSymbol === item.symbol}
                      quote={quoteState.loading && !quoteState.quotes[item.symbol] ? undefined : quoteState.quotes[item.symbol] ?? null}
                      busy={busy}
                      canMoveUp={reorderEnabled && savedIndex > 0}
                      canMoveDown={reorderEnabled && savedIndex >= 0 && savedIndex < watchlist.items.length - 1}
                      onEdit={() => openEdit(item)}
                      onMonitor={() => {
                        setMonitoredSymbol(item.symbol);
                        setMonitorOpen(true);
                      }}
                      onRemove={() => setPendingRemove(item)}
                      onMoveUp={() => void watchlist.moveItem(item.symbol, "up")}
                      onMoveDown={() => void watchlist.moveItem(item.symbol, "down")}
                    />
                  );
                }) : (
                  <p className={styles.filteredEmpty}>No saved ideas match “{listFilter}”. Clear the filter to see your full list.</p>
                )}
              </div>
            </section>
          )}
        </div>
      </main>

      <Dialog open={Boolean(editingItem)} onClose={() => !busy && setEditingItem(null)} fullWidth maxWidth="sm" PaperProps={{ className: styles.dialogPaper }}>
        <form onSubmit={saveDraft}>
          <DialogTitle>Edit {editingItem?.symbol} Research</DialogTitle>
          <DialogContent dividers className={styles.dialogContent}>
            <label className={styles.dialogField} htmlFor="watchlist-note">
              <span>Why are you watching this?</span>
              <textarea id="watchlist-note" name="watchlist-note" rows={4} maxLength={WATCHLIST_NOTE_LIMIT} value={draft.note} onChange={(event) => setDraft((current) => ({ ...current, note: event.target.value }))} aria-describedby="watchlist-note-help" aria-invalid={Boolean(draftErrors.note)} />
              <small id="watchlist-note-help">Use a factual question or event to revisit. {draft.note.length}/{WATCHLIST_NOTE_LIMIT}</small>
              {draftErrors.note ? <em role="alert">{draftErrors.note}</em> : null}
            </label>
            <label className={styles.dialogField} htmlFor="watchlist-target">
              <span>Optional research target</span>
              <input id="watchlist-target" name="watchlist-target" type="number" inputMode="decimal" min="0.01" step="0.01" placeholder="Example: 120.00" value={draft.targetPrice} onChange={(event) => setDraft((current) => ({ ...current, targetPrice: event.target.value }))} aria-invalid={Boolean(draftErrors.targetPrice)} />
              <small>This is a personal comparison point, not an alert or recommendation.</small>
              {draftErrors.targetPrice ? <em role="alert">{draftErrors.targetPrice}</em> : null}
            </label>
          </DialogContent>
          <DialogActions className={styles.dialogActions}>
            <button type="button" className={cn(styles.secondaryButton, FIT_FOCUS_VISIBLE)} onClick={() => setEditingItem(null)} disabled={busy}>Cancel</button>
            <button type="submit" className={cn(styles.primaryButton, FIT_FOCUS_VISIBLE)} disabled={busy}>{watchlist.busyAction === "edit" ? "Saving…" : "Save Research"}</button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog open={Boolean(pendingRemove)} onClose={() => !busy && setPendingRemove(null)} fullWidth maxWidth="xs" PaperProps={{ className: styles.dialogPaper }}>
        <DialogTitle>Remove {pendingRemove?.symbol}?</DialogTitle>
        <DialogContent dividers className={styles.dialogContent}>
          <p>This removes its note and research target from your watchlist. It does not affect your portfolio.</p>
        </DialogContent>
        <DialogActions className={styles.dialogActions}>
          <button type="button" className={cn(styles.secondaryButton, FIT_FOCUS_VISIBLE)} onClick={() => setPendingRemove(null)} disabled={busy}>Keep Item</button>
          <button type="button" className={cn(styles.dangerButton, FIT_FOCUS_VISIBLE)} onClick={() => void confirmRemove()} disabled={busy}>{watchlist.busyAction === "remove" ? "Removing…" : "Remove Item"}</button>
        </DialogActions>
      </Dialog>

      <ModalLogin show={showLogin} onHide={() => setShowLogin(false)} redirectTo="/Watchlist" onShowSignUp={() => { setShowLogin(false); setShowSignUp(true); }} />
      <ModalSignUp show={showSignUp} onHide={() => setShowSignUp(false)} redirectTo="/Watchlist" setLogin={(open) => { setShowSignUp(false); setShowLogin(open); }} />
    </FitPageShell>
  );
}
