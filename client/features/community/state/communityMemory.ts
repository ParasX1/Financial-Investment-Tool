// File purpose: Centralizes remembered Community state shared across route transitions and remounts.
import type {
  CommentsState,
  CommunityFeedView,
  CommunityTopTimeRange,
  PostUI,
} from "../types";
import { DEMO_POSTS } from "../constants";
import { commentsReducer, createCommentsState } from "./commentsReducer";

export type CommunityMemoryCache = {
  posts: PostUI[];
  likedPostIds: string[];
  commentsState: CommentsState;
  ownerKey: string;
};

let communityMemoryCache: CommunityMemoryCache | null = null;
let rememberedCommunityFeedView: CommunityFeedView = "top";
let rememberedCommunityTopTimeRange: CommunityTopTimeRange = "all-time";
let rememberedCommunityQuery = "";
let rememberedDesktopSidebarCollapsed = false;

export function getCachedCommunityForOwner(ownerKey: string) {
  return communityMemoryCache?.ownerKey === ownerKey
    ? communityMemoryCache
    : null;
}

export function rememberCommunityData(cache: CommunityMemoryCache) {
  communityMemoryCache = cache;
}

export function invalidateCommunityDataForUser(currentUserId: string) {
  if (communityMemoryCache?.ownerKey === `user:${currentUserId}`) {
    communityMemoryCache = null;
  }
}

export function rememberLocalCommunityPost(post: PostUI) {
  const current =
    getCachedCommunityForOwner("demo") ??
    ({
      posts: [...DEMO_POSTS],
      likedPostIds: [],
      commentsState: createCommentsState(DEMO_POSTS),
      ownerKey: "demo",
    } satisfies CommunityMemoryCache);
  const posts = [
    post,
    ...current.posts.filter((candidate) => candidate.id !== post.id),
  ];

  communityMemoryCache = {
    ...current,
    posts,
    commentsState: commentsReducer(current.commentsState, {
      type: "ensurePost",
      postId: post.id,
      initialCount: 0,
    }),
  };
}

export function clearCommunityMemoryCache() {
  communityMemoryCache = null;
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
