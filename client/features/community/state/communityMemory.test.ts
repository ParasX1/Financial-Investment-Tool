import { beforeEach, describe, expect, it } from "@jest/globals";
import { createCommentsState } from "./commentsReducer";
import {
  clearCommunityMemoryCache,
  getCachedCommunityForUser,
  getRememberedCommunityFeedView,
  getRememberedCommunityQuery,
  getRememberedCommunityTopTimeRange,
  getRememberedDesktopSidebarCollapsed,
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
      currentUserId: "user-a",
      posts: [],
      likedPostIds: ["post-1"],
      commentsState: createCommentsState([]),
    };
    rememberCommunityData(cache);

    expect(getCachedCommunityForUser(true, "user-a")).toBe(cache);
    expect(getCachedCommunityForUser(true, "user-b")).toBeNull();
    expect(getCachedCommunityForUser(false, "user-a")).toBeNull();

    clearCommunityMemoryCache();
    expect(getCachedCommunityForUser(true, "user-a")).toBeNull();
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
});
