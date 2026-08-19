// File purpose: Tests Community service flows, delete authorization, and image cleanup ordering.
import {
  createCommunityComment,
  createCommunityPost,
  loadCommunityData,
  deleteCommunityComment,
  deleteCommunityPost,
} from "./communityService";

type QueryResult = {
  data?: unknown;
  error?: unknown;
};

type QueryStep = {
  table: string;
  result: QueryResult;
};

function createMockSupabase(
  steps: QueryStep[],
  userId: string | null = "user-1",
) {
  const events: string[] = [];
  const remove = jest.fn(async () => {
    events.push("storage.remove");
    return { error: null };
  });

  const db = {
    from: jest.fn((table: string) => {
      events.push(`table.${table}`);
      const step = steps.shift();
      if (!step) throw new Error(`Unexpected query for ${table}`);
      expect(table).toBe(step.table);

      const builder: any = {
        delete: jest.fn(() => builder),
        eq: jest.fn(() => builder),
        in: jest.fn(() => builder),
        insert: jest.fn(() => builder),
        order: jest.fn(() => builder),
        select: jest.fn(() => builder),
        single: jest.fn(async () => step.result),
        then: (resolve: (value: QueryResult) => unknown) =>
          Promise.resolve(step.result).then(resolve),
      };

      return builder;
    }),
    storage: {
      from: jest.fn(() => ({ remove })),
    },
    auth: {
      getSession: jest.fn(async () => ({
        data: { session: userId ? { user: { id: userId } } : null },
      })),
    },
  };

  return { db: db as any, events, remove };
}

describe("Community delete image cleanup", () => {
  it("requires a signed-in user before creating a remote discussion", async () => {
    const { db } = createMockSupabase([], null);

    await expect(
      createCommunityPost(
        db,
        {
          title: "Unsigned discussion",
          body: "This should not be inserted remotely.",
          tags: [],
          postType: "discussion",
          timeFrame: null,
          tickers: [],
          symbol: null,
          sourceUrl: null,
        },
        "user-1",
      ),
    ).rejects.toThrow("Sign in to create a discussion.");

    expect(db.from).not.toHaveBeenCalled();
  });

  it("rejects a discussion when the active session no longer owns the action", async () => {
    const db = {
      auth: {
        getSession: jest.fn().mockResolvedValue({
          data: { session: { user: { id: "user-b" } } },
        }),
      },
      from: jest.fn(),
    } as any;

    await expect(
      createCommunityPost(
        db,
        {
          title: "Stale discussion",
          body: "This must not be written as another account.",
          tags: [],
          postType: "discussion",
          timeFrame: null,
          tickers: [],
          symbol: null,
          sourceUrl: null,
        },
        "user-a",
      ),
    ).rejects.toThrow("Your session changed. Please try again.");

    expect(db.from).not.toHaveBeenCalled();
  });

  it("rejects more than four tickers at the service boundary", async () => {
    const { db } = createMockSupabase([]);

    await expect(
      createCommunityPost(
        db,
        {
          title: "Too many tickers",
          body: "This input should not be silently truncated.",
          tags: [],
          postType: "discussion",
          timeFrame: null,
          tickers: ["AAPL", "MSFT", "NVDA", "NFLX", "TSLA"],
          symbol: "AAPL",
          sourceUrl: null,
        },
        "user-1",
      ),
    ).rejects.toThrow("Add up to 4 tickers.");

    expect(db.from).not.toHaveBeenCalled();
  });

  it("rejects oversized raw Markdown before calling the repository", async () => {
    const { db } = createMockSupabase([]);

    await expect(
      createCommunityPost(
        db,
        {
          title: "Oversized discussion",
          body: "x".repeat(40_001),
          tags: [],
          postType: "discussion",
          timeFrame: null,
          tickers: [],
          symbol: null,
          sourceUrl: null,
        },
        "user-1",
      ),
    ).rejects.toThrow("Keep the post body to 40,000 characters or fewer.");

    expect(db.from).not.toHaveBeenCalled();
  });

  it("rejects unmatched persisted image references before calling the repository", async () => {
    const { db } = createMockSupabase([]);

    await expect(
      createCommunityPost(
        db,
        {
          title: "External image",
          body: "This image must not be loaded by other readers.",
          tags: [],
          postType: "discussion",
          timeFrame: null,
          tickers: [],
          symbol: null,
          sourceUrl: null,
          imageUrl: "https://tracker.example/pixel.png",
          imagePath: null,
        },
        "user-1",
      ),
    ).rejects.toThrow(
      "The post image reference is invalid. Reattach the image and try again.",
    );

    expect(db.from).not.toHaveBeenCalled();
  });

  it("persists four tickers when the legacy symbol repeats the primary", async () => {
    const postRow = {
      id: "post-1",
      title: "Four ticker comparison",
      body: "Compare four companies.",
      tags: [],
      symbol: "AAPL",
      votes: 0,
      created_at: "2026-07-19T00:00:00.000Z",
      author_id: "user-1",
    };
    const db = {
      auth: {
        getSession: jest.fn(async () => ({
          data: { session: { user: { id: "user-1" } } },
        })),
      },
      from: jest.fn(),
      rpc: jest.fn(async () => ({ data: [postRow], error: null })),
    } as any;

    await expect(
      createCommunityPost(
        db,
        {
          title: "Four ticker comparison",
          body: "Compare four companies.",
          tags: [],
          postType: "analysis",
          timeFrame: null,
          tickers: ["AAPL", "MSFT", "NVDA", "NFLX"],
          symbol: "AAPL",
          sourceUrl: null,
        },
        "user-1",
      ),
    ).resolves.toMatchObject({
      tickers: ["AAPL", "MSFT", "NVDA", "NFLX"],
      symbol: "AAPL",
    });
    expect(db.from).not.toHaveBeenCalled();
  });

  it("requires a signed-in user before creating a remote comment", async () => {
    const { db } = createMockSupabase([], null);

    await expect(
      createCommunityComment({
        authorId: "user-1",
        db,
        postId: "post-1",
        text: "Unsigned comment",
      }),
    ).rejects.toThrow("Sign in to comment.");

    expect(db.from).not.toHaveBeenCalled();
  });

  it("rejects a comment when the active session no longer owns the action", async () => {
    const db = {
      auth: {
        getSession: jest.fn().mockResolvedValue({
          data: { session: { user: { id: "user-b" } } },
        }),
      },
      from: jest.fn(),
    } as any;

    await expect(
      createCommunityComment({
        authorId: "user-a",
        db,
        postId: "post-1",
        text: "Stale action",
      }),
    ).rejects.toThrow("Your session changed. Please try again.");
    expect(db.from).not.toHaveBeenCalled();
  });

  it("rejects an external comment image reference before calling the repository", async () => {
    const { db } = createMockSupabase([]);

    await expect(
      createCommunityComment({
        authorId: "user-1",
        db,
        postId: "post-1",
        text: "Do not load this tracker.",
        imageUrl: "https://tracker.example/pixel.png",
      }),
    ).rejects.toThrow(
      "The comment image reference is invalid. Reattach the image and try again.",
    );

    expect(db.from).not.toHaveBeenCalled();
  });

  it("uses live posts without mixing demo discussions into the feed", async () => {
    const { db } = createMockSupabase([
      {
        table: "posts",
        result: {
          data: [
            {
              id: "post-1",
              title: "Live post",
              body: "Live body",
              tags: [],
              image_url: null,
              image_path: null,
              votes: 0,
              created_at: new Date().toISOString(),
              author_id: "user-1",
            },
          ],
          error: null,
        },
      },
      {
        table: "comments",
        result: { data: [], error: null },
      },
      {
        table: "post_likes",
        result: { data: [], error: null },
      },
      {
        table: "post_saves",
        result: { data: [], error: null },
      },
    ]);

    const result = await loadCommunityData(db, "user-1");

    expect(result.posts).toHaveLength(1);
    expect(result.posts[0].id).toBe("post-1");
  });

  it("keeps a successful empty remote feed empty instead of injecting demos", async () => {
    const { db } = createMockSupabase([
      {
        table: "posts",
        result: { data: [], error: null },
      },
    ]);

    const result = await loadCommunityData(db, "user-1");

    expect(result).toEqual({
      posts: [],
      comments: [],
      likedPostIds: [],
      savedPostIds: [],
    });
  });

  it("removes a deleted comment image from storage", async () => {
    const { db, remove } = createMockSupabase([
      {
        table: "comments",
        result: {
          data: {
            author_id: "user-1",
            image_path: "comments/post-1/comment.png",
          },
          error: null,
        },
      },
      {
        table: "comments",
        result: { data: [{ id: "comment-1" }], error: null },
      },
    ]);

    await deleteCommunityComment(db, "comment-1", "user-1");

    expect(remove).toHaveBeenCalledWith(["comments/post-1/comment.png"]);
  });

  it("rejects deleting another user's comment even for the discussion owner", async () => {
    const { db, remove } = createMockSupabase([
      {
        table: "comments",
        result: {
          data: {
            author_id: "commenter-1",
            post_id: "post-1",
            image_path: "comments/post-1/comment.png",
          },
          error: null,
        },
      },
    ]);

    await expect(
      deleteCommunityComment(db, "comment-1", "user-1"),
    ).rejects.toThrow("You can only delete comments you created.");

    expect(remove).not.toHaveBeenCalled();
  });

  it("removes post and comment images when deleting a discussion", async () => {
    const { db, events, remove } = createMockSupabase([
      {
        table: "posts",
        result: {
          data: {
            author_id: "user-1",
            image_path: "posts/post.png",
          },
          error: null,
        },
      },
      {
        table: "comments",
        result: {
          data: [
            { image_path: "comments/post-1/a.png" },
            { image_path: null },
            { image_path: "comments/post-1/b.png" },
          ],
          error: null,
        },
      },
      {
        table: "posts",
        result: { data: [{ id: "post-1" }], error: null },
      },
    ]);

    await deleteCommunityPost(db, "post-1", "user-1");

    expect(events).toEqual([
      "table.posts",
      "table.comments",
      "table.posts",
      "storage.remove",
    ]);
    expect(remove).toHaveBeenCalledWith([
      "posts/post.png",
      "comments/post-1/a.png",
      "comments/post-1/b.png",
    ]);
  });

  it("keeps storage images when discussion row deletion fails", async () => {
    const { db, remove } = createMockSupabase([
      {
        table: "posts",
        result: {
          data: {
            author_id: "user-1",
            image_path: "posts/post.png",
          },
          error: null,
        },
      },
      {
        table: "comments",
        result: {
          data: [{ image_path: "comments/post-1/a.png" }],
          error: null,
        },
      },
      {
        table: "posts",
        result: { data: null, error: new Error("delete failed") },
      },
    ]);

    await expect(deleteCommunityPost(db, "post-1", "user-1")).rejects.toThrow(
      "delete failed",
    );

    expect(remove).not.toHaveBeenCalled();
  });
});
