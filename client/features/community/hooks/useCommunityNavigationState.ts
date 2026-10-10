// File purpose: Owns remembered Community feed, search, and time-range navigation state.
import * as React from "react";
import {
  getRememberedCommunityFeedView,
  getRememberedCommunityQuery,
  getRememberedCommunityTopTimeRange,
  rememberCommunityFeedView,
  rememberCommunityQuery,
  rememberCommunityTopTimeRange,
} from "../state/communityMemory";
import type { CommunityFeedView, CommunityTopTimeRange } from "../types";

export function useCommunityNavigationState() {
  const [query, setQueryState] = React.useState(getRememberedCommunityQuery);
  const [feedView, setFeedViewState] = React.useState<CommunityFeedView>(
    getRememberedCommunityFeedView,
  );
  const [topTimeRange, setTopTimeRangeState] =
    React.useState<CommunityTopTimeRange>(getRememberedCommunityTopTimeRange);

  const setQuery = React.useCallback((nextQuery: string) => {
    rememberCommunityQuery(nextQuery);
    setQueryState(nextQuery);
  }, []);

  const setFeedView = React.useCallback((nextView: CommunityFeedView) => {
    rememberCommunityFeedView(nextView);
    setFeedViewState(nextView);
  }, []);

  const setTopTimeRange = React.useCallback(
    (nextRange: CommunityTopTimeRange) => {
      rememberCommunityTopTimeRange(nextRange);
      setTopTimeRangeState(nextRange);
    },
    [],
  );

  return {
    feedView,
    query,
    setFeedView,
    setQuery,
    setTopTimeRange,
    topTimeRange,
  };
}
