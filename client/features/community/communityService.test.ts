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
      createCommunityPost(db, {
        title: "Unsigned discussion",
        body: "This should not be inserted remotely.",
        tags: [],
      }),
    ).rejects.toThrow("Sign in to create a discussion.");

    expect(db.from).not.toHaveBeenCalled();
  });

  it("requires a signed-in user before creating a remote comment", async () => {
    const { db } = createMockSupabase([], null);

    await expect(
      createCommunityComment({
        db,
        postId: "post-1",
        text: "Unsigned comment",
      }),
    ).rejects.toThrow("Sign in to comment.");

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
    ]);

    const result = await loadCommunityData(db, "user-1");

    expect(result.posts).toHaveLength(1);
    expect(result.posts[0].id).toBe("post-1");
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

    await expect(deleteCommunityComment(db, "comment-1", "user-1")).rejects.toThrow(
      "You can only delete comments you created.",
    );

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
      "storage.remove",
      "table.posts",
    ]);
    expect(remove).toHaveBeenCalledWith([
      "posts/post.png",
      "comments/post-1/a.png",
      "comments/post-1/b.png",
    ]);
  });
});
