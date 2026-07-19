// File purpose: Tests Community helper behavior across mapping, validation, draft state, load status, and feed selectors.
import {
  commentFromRow,
  createLocalPost,
  postFromRow,
} from "./communityMappers";
import {
  getCommunityFeedCounts,
  getTopTimeRangeCutoff,
  getVisibleCommunityPosts,
} from "./communitySelectors";
import { getCommunityLoadErrorMessage } from "./communityLoadStatus";
import {
  isDiscussionDraftDirty,
  normalizeDiscussionDraft,
} from "./communityDraft";
import { validateCommunityImage } from "./communityValidation";
import type { CommentRow, CommentsState, DBPost, PostUI } from "../types";

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
        post_type: "analysis",
        symbol: " nvda ",
        source_url: " https://www.sec.gov/Archives/example ",
        image_url: "https://example.com/post.png",
        image_path: "posts/post.png",
      } as DBPost,
      "user-1",
    );

    expect(post.tags).toEqual(["Strategy", "$NVDA"]);
    expect(post.postType).toBe("analysis");
    expect(post.symbol).toBe("NVDA");
    expect(post.sourceUrl).toBe("https://www.sec.gov/Archives/example");
    expect(post.imageUrl).toBe("https://example.com/post.png");
    expect((post as any).imagePath).toBe("posts/post.png");
  });

  it("maps ordered structured tickers and keeps the first as the legacy primary", () => {
    const post = postFromRow({
      ...baseRow,
      symbol: "NVDA",
      post_tickers: [
        { symbol: "NFLX", position: 1 },
        { symbol: "NVDA", position: 0 },
      ],
    });

    expect(post.tickers).toEqual(["NVDA", "NFLX"]);
    expect(post.symbol).toBe("NVDA");
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

  it("allows title-only discussions without injecting placeholder body copy", () => {
    const remotePost = postFromRow(
      {
        ...baseRow,
        title: "Title-only update",
        body: "",
      },
      "user-1",
    );
    const localPost = createLocalPost({
      title: "Title-only update",
      body: "",
      tags: [],
    });

    expect(remotePost.body).toBe("");
    expect(localPost.body).toBe("");
  });

  it("keeps local discussions tagless when no tags are selected", () => {
    const post = createLocalPost({
      title: "NVDA earnings risk",
      body: "Looking at Nvidia guidance and downside risk.",
      tags: [],
      postType: "discussion",
      timeFrame: null,
      tickers: [],
      symbol: null,
      sourceUrl: null,
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
        postType: "analysis",
        timeFrame: "medium",
        tickers: [" tsla ", "nvda"],
        tickerInput: "",
        sourceUrl: " https://example.com/research ",
      }),
    ).toEqual({
      title: "TSLA earnings idea",
      body: "Looking at implied volatility.",
      tags: ["Risk"],
      postType: "analysis",
      timeFrame: "medium",
      tickers: ["TSLA", "NVDA"],
      symbol: "TSLA",
      sourceUrl: "https://example.com/research",
    });
  });

  it("derives authenticated comment labels from ownership, not user input", () => {
    const row: CommentRow = {
      id: "comment-1",
      post_id: "post-1",
      user_name: "Administrator",
      body: "Comment",
      image_url: null,
      created_at: "2026-07-17T00:00:00.000Z",
      author_id: "user-b",
    };

    expect(commentFromRow(row, "user-a").user).toBe("Member");
    expect(commentFromRow(row, "user-b").user).toBe("You");
    expect(
      commentFromRow({ ...row, author_id: null, user_name: null }, "user-a")
        .user,
    ).toBe("Guest");
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
    postType: "" as const,
    timeFrame: "" as const,
    tickers: [],
    tickerInput: "",
    sourceUrl: "",
    imageFile: null,
    imagePreviewUrl: null,
  };

  it("detects meaningful unsaved draft content", () => {
    expect(isDiscussionDraftDirty(emptyDraft)).toBe(false);
    expect(isDiscussionDraftDirty({ ...emptyDraft, title: "  " })).toBe(false);
    expect(isDiscussionDraftDirty({ ...emptyDraft, title: "Draft" })).toBe(
      true,
    );
    expect(isDiscussionDraftDirty({ ...emptyDraft, body: "Body" })).toBe(true);
    expect(isDiscussionDraftDirty({ ...emptyDraft, tags: ["Risk"] })).toBe(
      true,
    );
  });
});

describe("Community load status", () => {
  it("preserves all partial-load warnings when multiple secondary queries fail", () => {
    expect(
      getCommunityLoadErrorMessage({
        commentsError: "Posts loaded, but comments could not be loaded.",
        likesError: "Posts loaded, but saved like state could not be loaded.",
      }),
    ).toBe(
      "Posts loaded, but comments could not be loaded. Posts loaded, but saved like state could not be loaded.",
    );
  });

  it("returns null when community data loaded without secondary warnings", () => {
    expect(getCommunityLoadErrorMessage({})).toBeNull();
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

  it("keeps top ranking tied to engagement when posts have similar context", () => {
    const now = new Date("2026-05-20T12:00:00Z").getTime();
    const visible = getVisibleCommunityPosts({
      posts: [
        {
          ...posts[0],
          id: "generic",
          title: "General discussion",
          body: "Open for broad community discussion.",
          tags: [],
          postType: "discussion",
          votes: 10,
          sortTime: now,
        },
        {
          ...posts[1],
          id: "context",
          title: "TSLA delivery note",
          body: "Source: https://example.com/tsla Delivery data could move the stock this week.",
          tags: ["News", "$TSLA"],
          postType: "news",
          symbol: "TSLA",
          sourceUrl: "https://www.reuters.com/example",
          votes: 10,
          sortTime: now,
        },
      ],
      query: "",
      view: "top",
      now,
      likedPostIds: new Set(),
      commentsState,
      currentUserId: "user-1",
    });

    expect(visible.map((post) => post.id)).toEqual(["generic", "context"]);
  });

  it("keeps top ranking stable across viewer-specific liked state", () => {
    const now = new Date("2026-05-20T12:00:00Z").getTime();
    const topPosts: PostUI[] = [
      {
        ...posts[0],
        id: "first",
        title: "CBA earnings watch",
        body: "CBA.AX margin setup before earnings.",
        tags: ["Earnings", "$CBA.AX"],
        votes: 10,
        sortTime: now,
      },
      {
        ...posts[1],
        id: "second",
        title: "BHP risk review",
        body: "BHP.AX downside risk after iron ore weakness.",
        tags: ["Risk", "$BHP.AX"],
        votes: 9,
        sortTime: now,
      },
    ];
    const base = {
      posts: topPosts,
      query: "",
      view: "top" as const,
      now,
      commentsState,
      currentUserId: "user-1",
    };

    const unliked = getVisibleCommunityPosts({
      ...base,
      likedPostIds: new Set(),
    }).map((post) => post.id);
    const likedSecond = getVisibleCommunityPosts({
      ...base,
      likedPostIds: new Set(["second"]),
    }).map((post) => post.id);

    expect(likedSecond).toEqual(unliked);
  });

  it("matches search against explicit source domains and symbols", () => {
    const visible = getVisibleCommunityPosts({
      posts: [
        {
          ...posts[0],
          id: "source-backed",
          title: "Delivery catalyst",
          body: "Tesla delivery data could move the stock.",
          tags: [],
          postType: "news",
          symbol: "TSLA",
          sourceUrl: "https://www.sec.gov/example",
        },
      ],
      query: "sec.gov",
      view: "new",
      likedPostIds: new Set(),
      commentsState,
      currentUserId: "user-1",
    });

    expect(visible.map((post) => post.id)).toEqual(["source-backed"]);
  });

  it("limits top discussions to the selected time range before sorting by votes", () => {
    const now = new Date("2026-05-20T12:00:00Z").getTime();
    const visible = getVisibleCommunityPosts({
      posts: [
        {
          ...posts[0],
          id: "older-popular",
          votes: 100,
          sortTime: now - 9 * 24 * 60 * 60 * 1000,
        },
        {
          ...posts[1],
          id: "recent-mid",
          votes: 40,
          sortTime: now - 2 * 24 * 60 * 60 * 1000,
        },
        {
          ...posts[2],
          id: "recent-top",
          votes: 80,
          sortTime: now - 60 * 60 * 1000,
        },
      ],
      query: "",
      view: "top",
      topTimeRange: "past-week",
      now,
      likedPostIds: new Set(),
      commentsState,
      currentUserId: "user-1",
    });

    expect(visible.map((post) => post.id)).toEqual([
      "recent-top",
      "recent-mid",
    ]);
  });

  it("does not apply the top time range to non-top feeds", () => {
    const now = new Date("2026-05-20T12:00:00Z").getTime();
    const visible = getVisibleCommunityPosts({
      posts: [
        {
          ...posts[0],
          id: "older-liked",
          sortTime: now - 30 * 24 * 60 * 60 * 1000,
        },
        {
          ...posts[1],
          id: "recent-liked",
          sortTime: now - 60 * 60 * 1000,
        },
      ],
      query: "",
      view: "liked",
      topTimeRange: "past-hour",
      now,
      likedPostIds: new Set(["older-liked", "recent-liked"]),
      commentsState,
      currentUserId: "user-1",
    });

    expect(visible.map((post) => post.id)).toEqual([
      "recent-liked",
      "older-liked",
    ]);
  });

  it("clamps past-month and past-year cutoffs around calendar boundaries", () => {
    const monthCutoff = new Date(
      getTopTimeRangeCutoff(
        "past-month",
        new Date("2026-05-31T12:00:00Z").getTime(),
      ) ?? 0,
    );
    const yearCutoff = new Date(
      getTopTimeRangeCutoff(
        "past-year",
        new Date("2024-02-29T12:00:00Z").getTime(),
      ) ?? 0,
    );

    expect(monthCutoff.getFullYear()).toBe(2026);
    expect(monthCutoff.getMonth()).toBe(3);
    expect(monthCutoff.getDate()).toBe(30);
    expect(yearCutoff.getFullYear()).toBe(2023);
    expect(yearCutoff.getMonth()).toBe(1);
    expect(yearCutoff.getDate()).toBe(28);
  });

  it("filters personal feed views without mixing unrelated posts", () => {
    const base = {
      posts,
      query: "",
      likedPostIds: new Set(["post-2"]),
      savedPostIds: new Set(["post-1"]),
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
      getVisibleCommunityPosts({ ...base, view: "saved" }).map(
        (post) => post.id,
      ),
    ).toEqual(["post-1"]);
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
        savedPostIds: new Set(["post-1"]),
        commentsState,
        currentUserId: "user-1",
      }),
    ).toEqual({
      top: 3,
      new: 3,
      "my-posts": 2,
      saved: 1,
      liked: 1,
      commented: 1,
    });
  });
});
