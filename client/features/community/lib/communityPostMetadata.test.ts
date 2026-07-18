import {
  getCommunityPostTypeLabel,
  getCommunityTimeFrameLabel,
  normalizeCommunityPostType,
  normalizeCommunitySourceUrl,
  normalizeCommunitySymbol,
  normalizeCommunityTimeFrame,
  validateCommunityResearchDraft,
} from "./communityPostMetadata";
import { normalizeDiscussionDraft } from "./communityDraft";

describe("Community post metadata", () => {
  it("normalizes explicit beginner-facing research context", () => {
    expect(normalizeCommunityPostType("analysis")).toBe("analysis");
    expect(normalizeCommunityPostType("unknown")).toBe("discussion");
    expect(normalizeCommunityTimeFrame("medium")).toBe("medium");
    expect(normalizeCommunityTimeFrame("intraday")).toBeNull();
    expect(normalizeCommunitySymbol(" $cba.ax ")).toBe("CBA.AX");
    expect(normalizeCommunitySymbol("not a ticker")).toBeNull();
  });

  it("accepts only safe public web sources", () => {
    expect(normalizeCommunitySourceUrl(" https://www.sec.gov/filing ")).toBe(
      "https://www.sec.gov/filing",
    );
    expect(normalizeCommunitySourceUrl("http://example.com/research")).toBe(
      "http://example.com/research",
    );
    expect(normalizeCommunitySourceUrl("javascript:alert(1)")).toBeNull();
    expect(
      normalizeCommunitySourceUrl("https://user:secret@example.com/private"),
    ).toBeNull();
  });

  it("provides plain-language labels without claiming verification", () => {
    expect(getCommunityPostTypeLabel("analysis")).toBe("Analysis");
    expect(getCommunityPostTypeLabel("discussion")).toBe("Discussion");
    expect(getCommunityTimeFrameLabel("short")).toBe("Short term");
    expect(getCommunityTimeFrameLabel(null)).toBeNull();
  });

  it("normalizes structured metadata with the discussion draft", () => {
    expect(
      normalizeDiscussionDraft({
        title: "  CBA   earnings review ",
        body: "  My reasoning.  ",
        tags: ["Earnings"],
        postType: "analysis",
        timeFrame: "medium",
        symbol: " cba.ax ",
        sourceUrl: " https://www.asx.com.au/announcement ",
      }),
    ).toEqual({
      title: "CBA earnings review",
      body: "My reasoning.",
      tags: ["Earnings"],
      postType: "analysis",
      timeFrame: "medium",
      symbol: "CBA.AX",
      sourceUrl: "https://www.asx.com.au/announcement",
    });
  });

  it("explains invalid explicit context instead of silently dropping it", () => {
    expect(
      validateCommunityResearchDraft({
        postType: "",
        symbol: "",
        sourceUrl: "",
      }),
    ).toBe("Choose a post type.");
    expect(
      validateCommunityResearchDraft({
        postType: "analysis",
        symbol: "not a ticker",
        sourceUrl: "",
      }),
    ).toBe("Enter a valid ticker, such as CBA.AX or NVDA.");
    expect(
      validateCommunityResearchDraft({
        postType: "news",
        symbol: "NVDA",
        sourceUrl: "javascript:alert(1)",
      }),
    ).toBe("Enter a valid http or https source URL.");
    expect(
      validateCommunityResearchDraft({
        postType: "analysis",
        timeFrame: "day-trade",
        symbol: "NVDA",
        sourceUrl: "",
      }),
    ).toBe("Choose a valid time frame or leave it blank.");
    expect(
      validateCommunityResearchDraft({
        postType: "question",
        symbol: "",
        sourceUrl: "",
      }),
    ).toBeNull();
  });
});
