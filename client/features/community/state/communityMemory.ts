// File purpose: Centralizes remembered Community state shared across route transitions and remounts.
import type {
  CommentsState,
  CommunityFeedView,
  CommunityTopTimeRange,
  PostUI,
} from "../types";

export type CommunityMemoryCache = {
  posts: PostUI[];
  likedPostIds: string[];
  commentsState: CommentsState;
  currentUserId: string | null;
};

let communityMemoryCache: CommunityMemoryCache | null = null;
let rememberedCommunityUserId: string | null = null;
let rememberedCommunityFeedView: CommunityFeedView = "top";
let rememberedCommunityTopTimeRange: CommunityTopTimeRange = "all-time";
let rememberedCommunityQuery = "";
let rememberedDesktopSidebarCollapsed = false;

export function getCachedCommunityForRememberedUser(enabled: boolean) {
  return enabled &&
    communityMemoryCache?.currentUserId === rememberedCommunityUserId
    ? communityMemoryCache
    : null;
}

export function hasCommunityMemoryCache() {
  return Boolean(communityMemoryCache);
}

export function rememberCommunityData(cache: CommunityMemoryCache) {
  communityMemoryCache = cache;
}

export function rememberCommunityUserId(nextUserId: string | null) {
  rememberedCommunityUserId = nextUserId;

  if (
    communityMemoryCache &&
    communityMemoryCache.currentUserId !== nextUserId
  ) {
    communityMemoryCache = null;
  }
}

export function getRememberedCommunityQuery() {
  return rememberedCommunityQuery;
}

export function rememberCommunityQuery(query: string) {
  rememberedCommunityQuery = query;
}

export function getRememberedCommunityFeedView() {
  return rememberedCommunityFeedView;
}

export function rememberCommunityFeedView(view: CommunityFeedView) {
  rememberedCommunityFeedView = view;
}

export function getRememberedCommunityTopTimeRange() {
  return rememberedCommunityTopTimeRange;
}

export function rememberCommunityTopTimeRange(range: CommunityTopTimeRange) {
  rememberedCommunityTopTimeRange = range;
}

export function getRememberedDesktopSidebarCollapsed() {
  return rememberedDesktopSidebarCollapsed;
}

export function rememberDesktopSidebarCollapsed(collapsed: boolean) {
  rememberedDesktopSidebarCollapsed = collapsed;
}
