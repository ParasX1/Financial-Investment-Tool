import * as React from "react";
import { useRouter } from "next/router";
import {
  defaultMarketNewsMarketScopeId,
  defaultMarketNewsTopicId,
  resolveMarketNewsMarketScope,
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
    (nextState: Partial<MarketNewsRouteState>) => {
      if (!router.isReady) return;

      const href = getMarketNewsRouteHref({
        lensId: viewState.activeLensId,
        marketScopeId: viewState.activeMarketScopeId,
        pageIndex: viewState.storyPageIndex,
        searchQuery: viewState.searchQuery,
        sortId: viewState.activeSortId,
        tickerSymbol: viewState.tickerSymbol,
        topicId: viewState.activeTopicId,
        ...nextState,
      });

      if (href !== router.asPath) {
        void router.replace(href, undefined, {
          scroll: false,
          shallow: true,
        });
      }
    },
    [router, viewState],
  );

  React.useEffect(() => {
    if (!router.isReady) return;

    const routeState = parseMarketNewsRouteQuery(router.query);
    setViewState((previousState) =>
      reconcileMarketNewsViewStateFromRoute(previousState, routeState),
    );
  }, [router.asPath, router.isReady, router.query]);

  const setSearchDraft = React.useCallback((searchDraft: string) => {
    setViewState((previousState) => ({ ...previousState, searchDraft }));
  }, []);

  const setLookupDraft = React.useCallback((lookupDraft: string) => {
    setViewState((previousState) => ({ ...previousState, lookupDraft }));
  }, []);

  const handleTopicChange = React.useCallback(
    (topicId: MarketNewsTopicId) => {
      const nextState = applyMarketNewsTopicChange(viewState, topicId);

      setViewState(nextState);
      syncRouteState({
        lensId: nextState.activeLensId,
        pageIndex: nextState.storyPageIndex,
        searchQuery: nextState.searchQuery,
        tickerSymbol: nextState.tickerSymbol,
        topicId: nextState.activeTopicId,
      });
    },
    [syncRouteState, viewState],
  );

  const handleSearchSubmit = React.useCallback(() => {
    const nextState = applyMarketNewsSearchSubmit(viewState);

    setViewState(nextState);
    syncRouteState({
      lensId: nextState.activeLensId,
      pageIndex: nextState.storyPageIndex,
      searchQuery: nextState.searchQuery,
      tickerSymbol: nextState.tickerSymbol,
    });
  }, [syncRouteState, viewState]);

  const handleSearchClear = React.useCallback(() => {
    const nextState = applyMarketNewsSearchClear(viewState);

    setViewState(nextState);
    syncRouteState({
      lensId: nextState.activeLensId,
      pageIndex: nextState.storyPageIndex,
      searchQuery: nextState.searchQuery,
      tickerSymbol: nextState.tickerSymbol,
    });
  }, [syncRouteState, viewState]);

  const handleRefresh = React.useCallback(() => {
    setViewState((previousState) => ({
      ...previousState,
      storyPageIndex: 0,
    }));
    setRefreshKey((key) => key + 1);
    syncRouteState({ pageIndex: 0 });
  }, [syncRouteState]);

  const handleMarketScopeChange = React.useCallback(
    (scopeId: MarketNewsMarketScopeId) => {
      const nextState = applyMarketNewsMarketScopeChange(viewState, scopeId);

      setViewState(nextState);
      syncRouteState({ marketScopeId: nextState.activeMarketScopeId });
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
      syncRouteState({
        lensId: nextState.activeLensId,
        pageIndex: nextState.storyPageIndex,
        searchQuery: nextState.searchQuery,
        tickerSymbol: nextState.tickerSymbol,
      });
      onQuoteLookup?.(nextState.tickerSymbol);
    },
    [onQuoteLookup, syncRouteState, viewState],
  );

  const handleLensChange = React.useCallback(
    (lensId: MarketNewsLensId) => {
      const nextState = applyMarketNewsLensChange(viewState, lensId);

      setViewState(nextState);
      syncRouteState({
        lensId: nextState.activeLensId,
        pageIndex: nextState.storyPageIndex,
      });
    },
    [syncRouteState, viewState],
  );

  const handleSortChange = React.useCallback(
    (sortId: MarketNewsSortId) => {
      const nextState = applyMarketNewsSortChange(viewState, sortId);

      setViewState(nextState);
      syncRouteState({ pageIndex: nextState.storyPageIndex, sortId });
    },
    [syncRouteState, viewState],
  );

  const resetEmptyLens = React.useCallback(() => {
    setViewState((previousState) => ({
      ...previousState,
      activeLensId: "all",
      storyPageIndex: 0,
    }));
    syncRouteState({ lensId: "all", pageIndex: 0 });
  }, [syncRouteState]);

  const clampStoryPageToCount = React.useCallback(
    (itemCount: number) => {
      setViewState((previousState) => {
        const clampedPageIndex = clampMarketNewsPageIndex(
          previousState.storyPageIndex,
          itemCount,
        );

        if (clampedPageIndex !== previousState.storyPageIndex) {
          syncRouteState({ pageIndex: clampedPageIndex });
        }

        return {
          ...previousState,
          storyPageIndex: clampedPageIndex,
        };
      });
    },
    [syncRouteState],
  );

  const handlePreviousPage = React.useCallback(() => {
    setViewState((previousState) => {
      const nextPageIndex = Math.max(0, previousState.storyPageIndex - 1);

      syncRouteState({ pageIndex: nextPageIndex });

      return {
        ...previousState,
        storyPageIndex: nextPageIndex,
      };
    });
  }, [syncRouteState]);

  const handleNextPage = React.useCallback(
    (hasNextPage: boolean) => {
      if (!hasNextPage) return;

      setViewState((previousState) => {
        const nextPageIndex = previousState.storyPageIndex + 1;

        syncRouteState({ pageIndex: nextPageIndex });

        return {
          ...previousState,
          storyPageIndex: nextPageIndex,
        };
      });
    },
    [syncRouteState],
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
