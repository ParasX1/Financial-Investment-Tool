// File purpose: Provides typed Community option ids used by routing, filters, and feed state.
export const COMMUNITY_FEED_VIEW_IDS = [
  "top",
  "new",
  "my-posts",
  "liked",
  "commented",
] as const;

export type CommunityFeedView = (typeof COMMUNITY_FEED_VIEW_IDS)[number];

export const COMMUNITY_TOP_TIME_RANGE_IDS = [
  "all-time",
  "past-year",
  "past-month",
  "past-week",
  "today",
  "past-hour",
] as const;

export type CommunityTopTimeRange =
  (typeof COMMUNITY_TOP_TIME_RANGE_IDS)[number];
