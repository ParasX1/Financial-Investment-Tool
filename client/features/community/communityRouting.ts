import {
  COMMUNITY_FEED_NAV_ITEMS,
  COMMUNITY_TOP_TIME_RANGE_ITEMS,
} from "./constants";
import type { CommunityFeedView, CommunityTopTimeRange } from "./types";

type QueryValue = string | string[] | undefined;

const communityFeedViewIds = new Set(
  COMMUNITY_FEED_NAV_ITEMS.map((item) => item.id),
);
const communityTopTimeRangeIds = new Set(
  COMMUNITY_TOP_TIME_RANGE_ITEMS.map((item) => item.id),
);

function readQueryValue(value: QueryValue) {
  return Array.isArray(value) ? value[0] : value;
}

export function isCommunityFeedView(
  value: string,
): value is CommunityFeedView {
  return communityFeedViewIds.has(value as CommunityFeedView);
}

export function isCommunityTopTimeRange(
  value: string,
): value is CommunityTopTimeRange {
  return communityTopTimeRangeIds.has(value as CommunityTopTimeRange);
}

export function getCommunityFeedViewFromQuery(
  value: QueryValue,
): CommunityFeedView {
  const view = readQueryValue(value);
  return view && isCommunityFeedView(view) ? view : "top";
}

export function getCommunityTopTimeRangeFromQuery(
  view: CommunityFeedView,
  value: QueryValue,
): CommunityTopTimeRange | null {
  if (view !== "top") return null;

  const range = readQueryValue(value);
  return range && isCommunityTopTimeRange(range) ? range : "all-time";
}

export function getCommunityFeedHref(
  view: CommunityFeedView,
  query: string,
  topTimeRange: CommunityTopTimeRange,
) {
  const params = new URLSearchParams();
  params.set("view", view);

  const trimmedQuery = query.trim();
  if (trimmedQuery) params.set("q", trimmedQuery);
  if (view === "top" && topTimeRange !== "all-time") {
    params.set("time", topTimeRange);
  }

  const serialized = params.toString();
  return serialized ? `/Community?${serialized}` : "/Community";
}

export function getCommunityCreateHref(
  view: CommunityFeedView,
  query: string,
  topTimeRange: CommunityTopTimeRange,
) {
  const feedHref = getCommunityFeedHref(view, query, topTimeRange);
  const queryStart = feedHref.indexOf("?");
  return queryStart === -1
    ? "/CommunityCreate"
    : `/CommunityCreate${feedHref.slice(queryStart)}`;
}
