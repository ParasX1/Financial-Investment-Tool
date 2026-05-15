import {
  createLocalPost,
  getCommunityFeedCounts,
  getVisibleCommunityPosts,
  isDiscussionDraftDirty,
  normalizeDiscussionDraft,
  postFromRow,
  validateCommunityImage,
} from "./utils";
import type { CommentsState, DBPost, PostUI } from "./types";

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

describe("Discussion draft dirty state", () => {
  const emptyDraft = {
    title: "",
    body: "",
    tags: [],
    imageFile: null,
    imagePreviewUrl: null,
  };

  it("detects meaningful unsaved draft content", () => {
    expect(isDiscussionDraftDirty(emptyDraft)).toBe(false);
    expect(isDiscussionDraftDirty({ ...emptyDraft, title: "  " })).toBe(false);
    expect(isDiscussionDraftDirty({ ...emptyDraft, title: "Draft" })).toBe(true);
    expect(isDiscussionDraftDirty({ ...emptyDraft, body: "Body" })).toBe(true);
    expect(isDiscussionDraftDirty({ ...emptyDraft, tags: ["Risk"] })).toBe(true);
  });
});

describe("Community feed filtering", () => {
  const posts: PostUI[] = [
    {
      ...createLocalPost({
        title: "Local draft",
        body: "My local discussion",
        tags: [],
      }),
      id: "local-1",
      votes: 2,
      sortTime: 300,
    },
    {
      ...postFromRow(
        {
          ...baseRow,
          id: "post-1",
          title: "My NVDA thesis",
          body: "AI demand is still strong.",
          votes: 8,
          created_at: new Date(200).toISOString(),
          author_id: "user-1",
        },
        "user-1",
      ),
      sortTime: 200,
    },
    {
      ...postFromRow(
        {
          ...baseRow,
          id: "post-2",
          title: "Macro risk",
          body: "Looking at rates and credit.",
          votes: 13,
          created_at: new Date(100).toISOString(),
          author_id: "user-2",
        },
        "user-1",
      ),
      sortTime: 100,
    },
  ];

  const commentsState: CommentsState = {
    byPost: {
      "post-2": [
        {
          id: "comment-1",
          user: "You",
          text: "Interesting setup",
          createdAt: new Date().toISOString(),
          authorId: "user-1",
          fromDB: true,
        },
      ],
    },
    counts: { "post-2": 1 },
    seenIds: { "comment-1": true },
  };

  it("shows top discussions by vote count", () => {
    const visible = getVisibleCommunityPosts({
      posts,
      query: "",
      view: "top",
      likedPostIds: new Set(["post-2"]),
      commentsState,
      currentUserId: "user-1",
    });

    expect(visible.map((post) => post.id)).toEqual([
      "post-2",
      "post-1",
      "local-1",
    ]);
  });

  it("filters personal feed views without mixing unrelated posts", () => {
    const base = {
      posts,
      query: "",
      likedPostIds: new Set(["post-2"]),
      commentsState,
      currentUserId: "user-1",
    };

    expect(
      getVisibleCommunityPosts({ ...base, view: "my-posts" }).map(
        (post) => post.id,
      ),
    ).toEqual(["local-1", "post-1"]);
    expect(
      getVisibleCommunityPosts({ ...base, view: "liked" }).map(
        (post) => post.id,
      ),
    ).toEqual(["post-2"]);
    expect(
      getVisibleCommunityPosts({ ...base, view: "commented" }).map(
        (post) => post.id,
      ),
    ).toEqual(["post-2"]);
  });

  it("counts each community feed view", () => {
    expect(
      getCommunityFeedCounts({
        posts,
        likedPostIds: new Set(["post-2"]),
        commentsState,
        currentUserId: "user-1",
      }),
    ).toEqual({
      top: 3,
      new: 3,
      "my-posts": 2,
      liked: 1,
      commented: 1,
    });
  });
});
