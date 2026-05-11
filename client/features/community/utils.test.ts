import {
  createLocalPost,
  normalizeDiscussionDraft,
  postFromRow,
  validateCommunityImage,
} from "./utils";
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
        image_url: "https://example.com/post.png",
        image_path: "posts/post.png",
      } as DBPost,
      "user-1",
    );

    expect(post.tags).toEqual(["Strategy", "$NVDA"]);
    expect(post.imageUrl).toBe("https://example.com/post.png");
    expect((post as any).imagePath).toBe("posts/post.png");
  });

  it("infers tags when saved tags are missing from legacy rows", () => {
    const post = postFromRow(
      {
        ...baseRow,
        tags: null,
      },
      "user-1",
    );

    expect(post.tags).toEqual(
      expect.arrayContaining(["Earnings", "Risk", "$NVDA"]),
    );
  });

  it("keeps persisted empty tags as an intentional no-tag choice", () => {
    const post = postFromRow(
      {
        ...baseRow,
        tags: [],
      },
      "user-1",
    );

    expect(post.tags).toEqual([]);
  });

  it("keeps local discussions tagless when no tags are selected", () => {
    const post = createLocalPost({
      title: "NVDA earnings risk",
      body: "Looking at Nvidia guidance and downside risk.",
      tags: [],
      imageUrl: "blob:http://localhost/local-post-image",
    });

    expect(post.tags).toEqual([]);
    expect(post.imageUrl).toBe("blob:http://localhost/local-post-image");
  });

  it("normalizes draft tags before insert", () => {
    expect(
      normalizeDiscussionDraft({
        title: "  TSLA earnings   idea ",
        body: " Looking at implied volatility. ",
        tags: ["$tsla", "Risk", "Risk", "<bad>"],
      }),
    ).toEqual({
      title: "TSLA earnings idea",
      body: "Looking at implied volatility.",
      tags: ["$TSLA", "Risk"],
    });
  });
});

describe("Community image validation", () => {
  function imageFile(overrides: Partial<File> = {}) {
    return {
      name: "chart.png",
      size: 1024,
      type: "image/png",
      ...overrides,
    } as File;
  }

  it("accepts supported community image files", () => {
    expect(validateCommunityImage(imageFile())).toBeNull();
  });

  it("rejects unsupported community image files", () => {
    expect(
      validateCommunityImage(
        imageFile({ name: "chart.svg", type: "image/svg+xml" }),
      ),
    ).toBe("Attach a JPG, PNG, WebP, or GIF image.");
  });

  it("rejects oversized community image files", () => {
    expect(validateCommunityImage(imageFile({ size: 6 * 1024 * 1024 }))).toBe(
      "Image must be 5 MB or smaller.",
    );
  });
});
