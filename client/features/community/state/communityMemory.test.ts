import { beforeEach, describe, expect, it } from "@jest/globals";
import { createCommentsState } from "./commentsReducer";
import {
  clearCommunityMemoryCache,
  getCachedCommunityForOwner,
  getRememberedCommunityFeedView,
  getRememberedCommunityQuery,
  getRememberedCommunityTopTimeRange,
  getRememberedDesktopSidebarCollapsed,
  invalidateCommunityDataForUser,
  rememberLocalCommunityPost,
  rememberCommunityData,
  rememberCommunityFeedView,
  rememberCommunityQuery,
  rememberCommunityTopTimeRange,
  rememberDesktopSidebarCollapsed,
} from "./communityMemory";

describe("community memory ownership", () => {
  beforeEach(() => {
    clearCommunityMemoryCache();
    rememberCommunityFeedView("top");
    rememberCommunityQuery("");
    rememberCommunityTopTimeRange("all-time");
    rememberDesktopSidebarCollapsed(false);
  });

  it("returns cached feed data only to the account that owns it", () => {
    const cache = {
      ownerKey: "user:user-a",
      posts: [],
      likedPostIds: ["post-1"],
      savedPostIds: [],
      commentsState: createCommentsState([]),
    };
    rememberCommunityData(cache);

    expect(getCachedCommunityForOwner("user:user-a")).toBe(cache);
    expect(getCachedCommunityForOwner("user:user-b")).toBeNull();
    expect(getCachedCommunityForOwner("signed-out")).toBeNull();

    clearCommunityMemoryCache();
    expect(getCachedCommunityForOwner("user:user-a")).toBeNull();
  });

  it("remembers non-sensitive feed preferences across route transitions", () => {
    rememberCommunityFeedView("liked");
    rememberCommunityQuery("banks");
    rememberCommunityTopTimeRange("past-week");
    rememberDesktopSidebarCollapsed(true);

    expect(getRememberedCommunityFeedView()).toBe("liked");
    expect(getRememberedCommunityQuery()).toBe("banks");
    expect(getRememberedCommunityTopTimeRange()).toBe("past-week");
    expect(getRememberedDesktopSidebarCollapsed()).toBe(true);
  });

  it("keeps a local Create post in the demo feed until refresh", () => {
    const post = {
      id: "local-1",
      user: "You",
      initials: "YU",
      title: "Local discussion",
      body: "Saved in route memory.",
      votes: 0,
      time: "just now",
      sortTime: Date.now(),
      tags: [],
      commentCount: 0,
      avatarGradient: "linear-gradient(#000, #111)",
    };

    rememberLocalCommunityPost(post);

    const cache = getCachedCommunityForOwner("demo");
    expect(cache?.posts[0]).toEqual(post);
    expect(cache?.commentsState.counts[post.id]).toBe(0);
    expect(getCachedCommunityForOwner("demo")?.posts[0]).toEqual(post);
    expect(getCachedCommunityForOwner("signed-out")).toBeNull();
  });

  it("invalidates only the remote account that completed a create", () => {
    const cache = {
      ownerKey: "user:user-a",
      posts: [],
      likedPostIds: [],
      savedPostIds: [],
      commentsState: createCommentsState([]),
    };
    rememberCommunityData(cache);

    invalidateCommunityDataForUser("user-b");
    expect(getCachedCommunityForOwner("user:user-a")).toBe(cache);

    invalidateCommunityDataForUser("user-a");
    expect(getCachedCommunityForOwner("user:user-a")).toBeNull();
  });
});
