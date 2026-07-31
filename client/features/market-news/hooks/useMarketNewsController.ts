import * as React from "react";
import { useRouter } from "next/router";
import {
  defaultMarketNewsMarketScopeId,
  resolveMarketNewsMarketScope,
} from "@/lib/news/tickerStrip";
import {
  defaultMarketNewsTopicId,
  resolveMarketNewsTopic,
} from "../lib/marketNewsNavigation";
import { clampMarketNewsPageIndex } from "../lib/marketNewsPagination";
import {
  getMarketNewsRouteHref,
  parseMarketNewsRouteQuery,
  type MarketNewsRouteState,
} from "../lib/marketNewsRouting";
import {
  applyMarketNewsLensChange,
  applyMarketNewsMarketScopeChange,
  applyMarketNewsQuoteLookup,
  applyMarketNewsQuoteReferenceChange,
  applyMarketNewsSearchClear,
  applyMarketNewsSearchSubmit,
  applyMarketNewsSortChange,
  applyMarketNewsTopicChange,
  deriveMarketNewsViewStateFromRoute,
  reconcileMarketNewsViewStateFromRoute,
  type MarketNewsViewState,
} from "../lib/marketNewsViewState";
import type {
  MarketNewsLensId,
  MarketNewsMarketScopeId,
  MarketNewsSortId,
  MarketNewsTopicId,
} from "../types";

const initialRouteState: MarketNewsRouteState = {
  lensId: "all",
  marketScopeId: defaultMarketNewsMarketScopeId,
  pageIndex: 0,
  searchQuery: "",
  sortId: "latest",
  tickerSymbol: "",
  topicId: defaultMarketNewsTopicId,
};

function getRouteStateFromViewState(
  viewState: MarketNewsViewState,
): MarketNewsRouteState {
  return {
    lensId: viewState.activeLensId,
    marketScopeId: viewState.activeMarketScopeId,
    pageIndex: viewState.storyPageIndex,
    searchQuery: viewState.searchQuery,
    sortId: viewState.activeSortId,
    tickerSymbol: viewState.tickerSymbol,
    topicId: viewState.activeTopicId,
  };
}

function isCancelledNavigation(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "cancelled" in error &&
    error.cancelled === true
  );
}

export function useMarketNewsController({
  onQuoteLookup,
}: {
  onQuoteLookup?: (symbol: string) => void;
}) {
  const router = useRouter();
  const [viewState, setViewState] = React.useState<MarketNewsViewState>(() =>
    deriveMarketNewsViewStateFromRoute(initialRouteState),
  );
  const [refreshKey, setRefreshKey] = React.useState(0);

  const syncRouteState = React.useCallback(
    (nextViewState: MarketNewsViewState) => {
      if (!router.isReady || router.pathname !== "/MarketNews") return;

      const href = getMarketNewsRouteHref(
        getRouteStateFromViewState(nextViewState),
      );
      if (href !== router.asPath) {
        void router
          .replace(href, undefined, {
            scroll: false,
            shallow: true,
          })
          .catch((error: unknown) => {
            if (!isCancelledNavigation(error)) {
              console.error(
                "Failed to synchronize the Market News URL.",
                error,
              );
            }
          });
      }
    },
    [router],
  );

  React.useEffect(() => {
    if (!router.isReady) return;

    const routeState = parseMarketNewsRouteQuery(router.query);
    setViewState((previousState) =>
      reconcileMarketNewsViewStateFromRoute(previousState, routeState),
    );
  }, [router.asPath, router.isReady, router.query]);

  const setSearchDraft = React.useCallback((searchDraft: string) => {
    setViewState((previousState) =>
      previousState.searchDraft === searchDraft
        ? previousState
        : { ...previousState, searchDraft },
    );
  }, []);

  const setLookupDraft = React.useCallback((lookupDraft: string) => {
    setViewState((previousState) =>
      previousState.lookupDraft === lookupDraft
        ? previousState
        : { ...previousState, lookupDraft },
    );
  }, []);

  const handleTopicChange = React.useCallback(
    (topicId: MarketNewsTopicId) => {
      const nextState = applyMarketNewsTopicChange(viewState, topicId);

      setViewState(nextState);
      syncRouteState(nextState);
    },
    [syncRouteState, viewState],
  );

  const handleSearchSubmit = React.useCallback(() => {
    const nextState = applyMarketNewsSearchSubmit(viewState);

    setViewState(nextState);
    syncRouteState(nextState);
  }, [syncRouteState, viewState]);

  const handleSearchClear = React.useCallback(() => {
    const nextState = applyMarketNewsSearchClear(viewState);

    setViewState(nextState);
    syncRouteState(nextState);
  }, [syncRouteState, viewState]);

  const handleRefresh = React.useCallback(() => {
    if (viewState.storyPageIndex > 0) {
      const nextState = { ...viewState, storyPageIndex: 0 };
      setViewState(nextState);
      syncRouteState(nextState);
    }
    setRefreshKey((key) => key + 1);
  }, [syncRouteState, viewState]);

  const handleMarketScopeChange = React.useCallback(
    (scopeId: MarketNewsMarketScopeId) => {
      const nextState = applyMarketNewsMarketScopeChange(viewState, scopeId);

      setViewState(nextState);
      syncRouteState(nextState);
    },
    [syncRouteState, viewState],
  );

  const handleQuoteReferenceChange = React.useCallback(
    (value: string) => {
      const nextState = applyMarketNewsQuoteReferenceChange(viewState, value);
      if (nextState === viewState) return;

      setViewState(nextState);
    },
    [viewState],
  );

  const handleTickerNewsRequest = React.useCallback(
    (value: string) => {
      const nextState = applyMarketNewsQuoteLookup(viewState, value);
      if (nextState === viewState) return;

      setViewState(nextState);
      syncRouteState(nextState);
      onQuoteLookup?.(nextState.tickerSymbol);
    },
    [onQuoteLookup, syncRouteState, viewState],
  );

  const handleLensChange = React.useCallback(
    (lensId: MarketNewsLensId) => {
      const nextState = applyMarketNewsLensChange(viewState, lensId);

      setViewState(nextState);
      syncRouteState(nextState);
    },
    [syncRouteState, viewState],
  );

  const handleSortChange = React.useCallback(
    (sortId: MarketNewsSortId) => {
      const nextState = applyMarketNewsSortChange(viewState, sortId);

      setViewState(nextState);
      syncRouteState(nextState);
    },
    [syncRouteState, viewState],
  );

  const resetEmptyLens = React.useCallback(() => {
    if (viewState.activeLensId === "all" && viewState.storyPageIndex === 0) {
      return;
    }

    const nextState: MarketNewsViewState = {
      ...viewState,
      activeLensId: "all",
      storyPageIndex: 0,
    };
    setViewState(nextState);
    syncRouteState(nextState);
  }, [syncRouteState, viewState]);

  const clampStoryPageToCount = React.useCallback(
    (itemCount: number) => {
      const clampedPageIndex = clampMarketNewsPageIndex(
        viewState.storyPageIndex,
        itemCount,
      );
      if (clampedPageIndex === viewState.storyPageIndex) return;

      const nextState = {
        ...viewState,
        storyPageIndex: clampedPageIndex,
      };
      setViewState(nextState);
      syncRouteState(nextState);
    },
    [syncRouteState, viewState],
  );

  const handlePreviousPage = React.useCallback(() => {
    if (viewState.storyPageIndex === 0) return;

    const nextState = {
      ...viewState,
      storyPageIndex: viewState.storyPageIndex - 1,
    };
    setViewState(nextState);
    syncRouteState(nextState);
  }, [syncRouteState, viewState]);

  const handleNextPage = React.useCallback(
    (hasNextPage: boolean) => {
      if (!hasNextPage) return;

      const nextState = {
        ...viewState,
        storyPageIndex: viewState.storyPageIndex + 1,
      };
      setViewState(nextState);
      syncRouteState(nextState);
    },
    [syncRouteState, viewState],
  );

  const activeTopic = React.useMemo(
    () => resolveMarketNewsTopic(viewState.activeTopicId),
    [viewState.activeTopicId],
  );
  const activeMarketScope = React.useMemo(
    () => resolveMarketNewsMarketScope(viewState.activeMarketScopeId),
    [viewState.activeMarketScopeId],
  );

  return {
    activeLensId: viewState.activeLensId,
    activeMarketScope,
    activeMarketScopeId: viewState.activeMarketScopeId,
    activeSortId: viewState.activeSortId,
    activeTopic,
    activeTopicId: viewState.activeTopicId,
    clampStoryPageToCount,
    handleLensChange,
    handleMarketScopeChange,
    handleNextPage,
    handlePreviousPage,
    handleQuoteReferenceChange,
    handleRefresh,
    handleSearchClear,
    handleSearchSubmit,
    handleSortChange,
    handleTickerNewsRequest,
    handleTopicChange,
    lookupDraft: viewState.lookupDraft,
    quoteReferenceVisible: viewState.quoteReferenceVisible,
    refreshKey,
    resetEmptyLens,
    routeReady: router.isReady,
    searchDraft: viewState.searchDraft,
    searchQuery: viewState.searchQuery,
    selectedSymbol: viewState.selectedSymbol,
    setLookupDraft,
    setSearchDraft,
    storyPageIndex: viewState.storyPageIndex,
    tickerSymbol: viewState.tickerSymbol,
  };
}
