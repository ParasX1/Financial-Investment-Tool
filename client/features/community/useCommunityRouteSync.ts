import * as React from "react";
import type { NextRouter } from "next/router";
import {
  getCommunityFeedViewFromQuery,
  getCommunityTopTimeRangeFromQuery,
} from "./communityRouting";
import type { CommunityFeedView, CommunityTopTimeRange } from "./types";

export function useCommunityRouteSync({
  router,
  setFeedView,
  setQuery,
  setTopTimeRange,
}: {
  router: NextRouter;
  setFeedView: (view: CommunityFeedView) => void;
  setQuery: (query: string) => void;
  setTopTimeRange: (range: CommunityTopTimeRange) => void;
}) {
  React.useEffect(() => {
    if (!router.isReady) return;

    const queryView = router.query.view;
    const querySearch = router.query.q;
    const queryTime = router.query.time;

    const nextView = getCommunityFeedViewFromQuery(queryView);
    const nextTopTimeRange = getCommunityTopTimeRangeFromQuery(
      nextView,
      queryTime,
    );

    setFeedView(nextView);

    if (nextTopTimeRange) setTopTimeRange(nextTopTimeRange);

    setQuery(typeof querySearch === "string" ? querySearch : "");
  }, [
    router.isReady,
    router.query.q,
    router.query.time,
    router.query.view,
    setFeedView,
    setQuery,
    setTopTimeRange,
  ]);
}
