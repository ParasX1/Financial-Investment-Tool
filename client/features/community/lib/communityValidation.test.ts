// File purpose: Tests Community post content and image validation boundaries.
import {
  MAX_COMMUNITY_POST_BODY_CHARS,
  MAX_COMMUNITY_POST_TITLE_CHARS,
} from "../constants";
import { validateCommunityPostContent } from "./communityValidation";

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
