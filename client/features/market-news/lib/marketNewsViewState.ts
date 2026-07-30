import type {
  MarketNewsLensId,
  MarketNewsMarketScopeId,
  MarketNewsSortId,
  MarketNewsTopicId,
} from "../types";
import { resolveMarketNewsMarketScope } from "./marketNewsNavigation";
import type { MarketNewsRouteState } from "./marketNewsRouting";

export interface MarketNewsViewState {
  activeLensId: MarketNewsLensId;
  activeMarketScopeId: MarketNewsMarketScopeId;
  activeSortId: MarketNewsSortId;
  activeTopicId: MarketNewsTopicId;
  lookupDraft: string;
  quoteReferenceVisible: boolean;
  searchDraft: string;
  searchQuery: string;
  selectedSymbol: string;
  storyPageIndex: number;
  tickerSymbol: string;
}

function getFirstScopeSymbol(scopeId: MarketNewsMarketScopeId) {
  return resolveMarketNewsMarketScope(scopeId).tickers[0]?.symbol ?? "";
}

export function deriveMarketNewsViewStateFromRoute(
  routeState: MarketNewsRouteState,
): MarketNewsViewState {
  return {
    activeLensId: routeState.lensId,
    activeMarketScopeId: routeState.marketScopeId,
    activeSortId: routeState.sortId,
    activeTopicId: routeState.topicId,
    lookupDraft: routeState.tickerSymbol,
    quoteReferenceVisible: Boolean(routeState.tickerSymbol),
    searchDraft: routeState.searchQuery,
    searchQuery: routeState.searchQuery,
    selectedSymbol:
      routeState.tickerSymbol || getFirstScopeSymbol(routeState.marketScopeId),
    storyPageIndex: routeState.pageIndex,
    tickerSymbol: routeState.tickerSymbol,
  };
}

export function reconcileMarketNewsViewStateFromRoute(
  previousState: MarketNewsViewState,
  routeState: MarketNewsRouteState,
): MarketNewsViewState {
  const routeViewState = deriveMarketNewsViewStateFromRoute(routeState);

  if (
    routeState.searchQuery ||
    routeState.tickerSymbol ||
    previousState.tickerSymbol
  ) {
    return routeViewState;
  }

  return {
    ...routeViewState,
    lookupDraft: previousState.lookupDraft,
    quoteReferenceVisible: previousState.quoteReferenceVisible,
    selectedSymbol: previousState.quoteReferenceVisible
      ? previousState.selectedSymbol
      : routeViewState.selectedSymbol,
  };
}

export function applyMarketNewsTopicChange(
  state: MarketNewsViewState,
  topicId: MarketNewsTopicId,
): MarketNewsViewState {
  return {
    ...state,
    activeLensId: "all",
    activeTopicId: topicId,
    lookupDraft: "",
    quoteReferenceVisible: false,
    searchDraft: "",
    searchQuery: "",
    storyPageIndex: 0,
    tickerSymbol: "",
  };
}

export function applyMarketNewsSearchSubmit(
  state: MarketNewsViewState,
): MarketNewsViewState {
  return {
    ...state,
    activeLensId: "all",
    lookupDraft: "",
    quoteReferenceVisible: false,
    searchQuery: state.searchDraft.trim(),
    storyPageIndex: 0,
    tickerSymbol: "",
  };
}

export function applyMarketNewsSearchClear(
  state: MarketNewsViewState,
): MarketNewsViewState {
  return {
    ...state,
    activeLensId: "all",
    lookupDraft: "",
    quoteReferenceVisible: false,
    searchDraft: "",
    searchQuery: "",
    storyPageIndex: 0,
    tickerSymbol: "",
  };
}

export function applyMarketNewsMarketScopeChange(
  state: MarketNewsViewState,
  scopeId: MarketNewsMarketScopeId,
): MarketNewsViewState {
  const nextScope = resolveMarketNewsMarketScope(scopeId);

  return {
    ...state,
    activeMarketScopeId: nextScope.id,
    selectedSymbol: state.tickerSymbol || nextScope.tickers[0]?.symbol || "",
  };
}

export function applyMarketNewsQuoteLookup(
  state: MarketNewsViewState,
  value: string,
): MarketNewsViewState {
  const symbol = value.trim().toUpperCase();
  if (!symbol) return state;

  return {
    ...state,
    activeLensId: "all",
    lookupDraft: symbol,
    quoteReferenceVisible: true,
    searchDraft: "",
    searchQuery: "",
    selectedSymbol: symbol,
    storyPageIndex: 0,
    tickerSymbol: symbol,
  };
}

export function applyMarketNewsQuoteReferenceChange(
  state: MarketNewsViewState,
  value: string,
): MarketNewsViewState {
  const symbol = value.trim().toUpperCase();
  if (!symbol) return state;

  return {
    ...state,
    lookupDraft: symbol,
    quoteReferenceVisible: true,
    selectedSymbol: symbol,
  };
}

export function applyMarketNewsLensChange(
  state: MarketNewsViewState,
  lensId: MarketNewsLensId,
): MarketNewsViewState {
  return {
    ...state,
    activeLensId: lensId,
    storyPageIndex: 0,
  };
}

export function applyMarketNewsSortChange(
  state: MarketNewsViewState,
  sortId: MarketNewsSortId,
): MarketNewsViewState {
  return {
    ...state,
    activeSortId: sortId,
    storyPageIndex: 0,
  };
}
