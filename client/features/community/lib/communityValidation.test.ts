// File purpose: Tests Community post content and image validation boundaries.
import {
  MAX_COMMUNITY_POST_BODY_CHARS,
  MAX_COMMUNITY_POST_TITLE_CHARS,
} from "../constants";
import {
  validateCommunityCommentContent,
  validateCommunityPostContent,
} from "./communityValidation";

describe("validateCommunityCommentContent", () => {
  it.each(["x", "界", "😀"])(
    "accepts exactly 2,000 %s code points",
    (character) => {
      expect(
        validateCommunityCommentContent(character.repeat(2000)),
      ).toBeNull();
      expect(validateCommunityCommentContent(character.repeat(2001))).toBe(
        "Keep the comment to 2,000 characters or fewer.",
      );
    },
  );

  it("counts combining marks separately and preserves empty comment contracts", () => {
    expect(validateCommunityCommentContent("e\u0301".repeat(1000))).toBeNull();
    expect(
      validateCommunityCommentContent("e\u0301".repeat(1000) + "x"),
    ).not.toBeNull();
    expect(validateCommunityCommentContent("")).toBeNull();
    expect(validateCommunityCommentContent("  ")).toBeNull();
    expect(validateCommunityCommentContent(" ".repeat(2001))).not.toBeNull();
  });
});

describe("validateCommunityPostContent", () => {
  it("accepts plain text and raw Markdown within the storage limits", () => {
    expect(
      validateCommunityPostContent({
        title: "NVDA earnings: what changed?",
        body: "## Evidence\n\n- Revenue grew\n- Margin improved",
      }),
    ).toBeNull();
  });

  it("requires a title and enforces the Reddit-sized title boundary", () => {
    expect(validateCommunityPostContent({ title: " ", body: "" })).toBe(
      "Add a title.",
    );
    expect(
      validateCommunityPostContent({
        title: "x".repeat(MAX_COMMUNITY_POST_TITLE_CHARS + 1),
        body: "",
      }),
    ).toBe(
      `Keep the title to ${MAX_COMMUNITY_POST_TITLE_CHARS} characters or fewer.`,
    );
  });

  it("enforces the raw Markdown body boundary", () => {
    expect(
      validateCommunityPostContent({
        title: "Valid title",
        body: "x".repeat(MAX_COMMUNITY_POST_BODY_CHARS + 1),
      }),
    ).toBe(
      `Keep the post body to ${MAX_COMMUNITY_POST_BODY_CHARS.toLocaleString("en-US")} characters or fewer.`,
    );
  });
});
