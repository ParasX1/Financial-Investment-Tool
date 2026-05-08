import { createLocalPost, normalizeDiscussionDraft, postFromRow } from "./utils";
import type { DBPost } from "./types";

const baseRow: DBPost = {
  id: "post-1",
  title: "NVDA earnings risk",
  body: "Looking at Nvidia guidance and downside risk.",
  tags: null,
  votes: 3,
  created_at: new Date().toISOString(),
  author_id: "user-1",
};

describe("Community post mapping", () => {
  it("uses persisted tags before inferred tags", () => {
    const post = postFromRow(
      {
        ...baseRow,
        tags: [" Strategy ", "$nvda"],
      },
      "user-1"
    );

    expect(post.tags).toEqual(["Strategy", "$NVDA"]);
  });

  it("infers tags when saved tags are missing from legacy rows", () => {
    const post = postFromRow(
      {
        ...baseRow,
        tags: null,
      },
      "user-1"
    );

    expect(post.tags).toEqual(expect.arrayContaining(["Earnings", "Risk", "$NVDA"]));
  });

  it("keeps persisted empty tags as an intentional no-tag choice", () => {
    const post = postFromRow(
      {
        ...baseRow,
        tags: [],
      },
      "user-1"
    );

    expect(post.tags).toEqual([]);
  });

  it("keeps local discussions tagless when no tags are selected", () => {
    const post = createLocalPost({
      title: "NVDA earnings risk",
      body: "Looking at Nvidia guidance and downside risk.",
      tags: [],
    });

    expect(post.tags).toEqual([]);
  });

  it("normalizes draft tags before insert", () => {
    expect(
      normalizeDiscussionDraft({
        title: "  TSLA earnings   idea ",
        body: " Looking at implied volatility. ",
        tags: ["$tsla", "Risk", "Risk", "<bad>"],
      })
    ).toEqual({
      title: "TSLA earnings idea",
      body: "Looking at implied volatility.",
      tags: ["$TSLA", "Risk"],
    });
  });
});
