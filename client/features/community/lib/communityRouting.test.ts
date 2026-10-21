// File purpose: Tests Community route query parsing and serialization behavior.
import {
  getCommunityCreateHref,
  getCommunityFeedHref,
  getCommunityFeedViewFromQuery,
  getCommunityTopTimeRangeFromQuery,
} from "./communityRouting";

describe("Community routing helpers", () => {
  it("serializes the top time range only for the Top feed", () => {
    expect(getCommunityFeedHref("top", " nvda ", "past-week")).toBe(
      "/Community?view=top&q=nvda&time=past-week",
    );
    expect(getCommunityFeedHref("liked", " nvda ", "past-week")).toBe(
      "/Community?view=liked&q=nvda",
    );
  });

  it("preserves top time range when linking to the create page", () => {
    expect(getCommunityCreateHref("top", "", "today")).toBe(
      "/CommunityCreate?view=top&time=today",
    );
  });

  it("ignores hidden time query values when the selected feed is not Top", () => {
    const view = getCommunityFeedViewFromQuery("liked");

    expect(view).toBe("liked");
    expect(getCommunityTopTimeRangeFromQuery(view, "today")).toBeNull();
  });

  it("defaults invalid or missing Top time query values to all time", () => {
    expect(getCommunityTopTimeRangeFromQuery("top", undefined)).toBe(
      "all-time",
    );
    expect(getCommunityTopTimeRangeFromQuery("top", "bad-value")).toBe(
      "all-time",
    );
  });
});
