import {
  insertCommunityCommentRow,
  insertCommunityPostRow,
  loadCommunityPostRows,
  selectPostDeleteContext,
  setCommunityPostLikeValue,
} from "./communityRepository";

type QueryResult = {
  data?: unknown;
  error?: unknown;
};

type QueryStep = {
  table: string;
  result: QueryResult;
};

type QueryCall = {
  table: string;
  method: string;
  value?: unknown;
};

const missingColumn = (column: string) => ({
  code: "42703",
  message: `column "${column}" does not exist`,
});

function createRepositoryClient(steps: QueryStep[]) {
  const calls: QueryCall[] = [];
  const db = {
    from: jest.fn((table: string) => {
      const step = steps.shift();
      if (!step) throw new Error(`Unexpected query for ${table}`);
      expect(table).toBe(step.table);

      const builder: any = {
        delete: jest.fn(() => {
          calls.push({ table, method: "delete" });
          return builder;
        }),
        eq: jest.fn((column: string, value: unknown) => {
          calls.push({ table, method: `eq:${column}`, value });
          return builder;
        }),
        in: jest.fn((column: string, value: unknown) => {
          calls.push({ table, method: `in:${column}`, value });
          return builder;
        }),
        insert: jest.fn((value: unknown) => {
          calls.push({ table, method: "insert", value });
          return builder;
        }),
        order: jest.fn((column: string, value: unknown) => {
          calls.push({ table, method: `order:${column}`, value });
          return builder;
        }),
        select: jest.fn((value: string) => {
          calls.push({ table, method: "select", value });
          return builder;
        }),
        single: jest.fn(async () => step.result),
        then: (resolve: (value: QueryResult) => unknown) =>
          Promise.resolve(step.result).then(resolve),
      };

      return builder;
    }),
  };

  return { db: db as any, calls };
}

describe("Community repository", () => {
  it("falls back to legacy post selects when a newer column is missing", async () => {
    const livePost = {
      id: "post-1",
      title: "Legacy compatible post",
      body: "Body",
      tags: [],
      image_url: null,
      votes: 1,
      created_at: "2026-05-01T00:00:00.000Z",
      author_id: "user-1",
    };
    const { db, calls } = createRepositoryClient([
      {
        table: "posts",
        result: { data: null, error: missingColumn("image_path") },
      },
      { table: "posts", result: { data: [livePost], error: null } },
    ]);

    const result = await loadCommunityPostRows(db);

    expect(result.data).toEqual([livePost]);
    const selects = calls
      .filter((call) => call.method === "select")
      .map((call) => String(call.value));
    expect(selects[0]).toContain("image_path");
    expect(selects[1]).not.toContain("image_path");
  });

  it("falls back for text-only post inserts without dropping an uploaded image", async () => {
    const insertedPost = {
      id: "post-1",
      title: "Text only",
      body: "Body",
      tags: [],
      image_url: null,
      votes: 0,
      created_at: "2026-05-01T00:00:00.000Z",
      author_id: "user-1",
    };
    const { db, calls } = createRepositoryClient([
      {
        table: "posts",
        result: { data: null, error: missingColumn("image_path") },
      },
      { table: "posts", result: { data: insertedPost, error: null } },
    ]);

    const row = await insertCommunityPostRow(
      db,
      {
        title: "Text only",
        body: "Body",
        tags: [],
        imageUrl: null,
        imagePath: null,
      },
      "user-1",
    );

    expect(row).toEqual(insertedPost);
    const inserts = calls
      .filter((call) => call.method === "insert")
      .map((call) => call.value as Record<string, unknown>);
    expect(inserts[0]).toHaveProperty("image_path");
    expect(inserts[1]).not.toHaveProperty("image_path");
  });

  it("does not silently fall back to an image-less post insert when an image was uploaded", async () => {
    const { db } = createRepositoryClient([
      {
        table: "posts",
        result: { data: null, error: missingColumn("image_path") },
      },
    ]);

    await expect(
      insertCommunityPostRow(
        db,
        {
          title: "Image post",
          body: "Body",
          tags: [],
          imageUrl: "https://cdn.example.com/post.png",
          imagePath: "posts/post.png",
        },
        "user-1",
      ),
    ).rejects.toThrow("Could not create post with the current Community schema.");

    expect(db.from).toHaveBeenCalledTimes(1);
  });

  it("falls back for text-only comment inserts when image_path is unavailable", async () => {
    const insertedComment = {
      id: "comment-1",
      post_id: "post-1",
      user_name: "You",
      body: "Looks good",
      image_url: null,
      created_at: "2026-05-01T00:00:00.000Z",
      author_id: "user-1",
    };
    const { db, calls } = createRepositoryClient([
      {
        table: "comments",
        result: { data: null, error: missingColumn("image_path") },
      },
      { table: "comments", result: { data: insertedComment, error: null } },
    ]);

    const row = await insertCommunityCommentRow({
      db,
      postId: "post-1",
      text: "Looks good",
      uid: "user-1",
    });

    expect(row).toEqual(insertedComment);
    const inserts = calls
      .filter((call) => call.method === "insert")
      .map((call) => call.value as Record<string, unknown>);
    expect(inserts[0]).toHaveProperty("image_path");
    expect(inserts[1]).not.toHaveProperty("image_path");
  });

  it("returns a null post image path when legacy delete context lacks image_path", async () => {
    const { db } = createRepositoryClient([
      {
        table: "posts",
        result: { data: null, error: missingColumn("image_path") },
      },
      {
        table: "posts",
        result: { data: { author_id: "user-1" }, error: null },
      },
    ]);

    await expect(selectPostDeleteContext(db, "post-1")).resolves.toEqual({
      data: { author_id: "user-1", image_path: null },
      error: null,
    });
  });

  it("uses the correct like RPC and normalizes numeric return values", async () => {
    const db = {
      rpc: jest.fn(async () => ({ data: "12", error: null })),
    };

    await expect(
      setCommunityPostLikeValue(db as any, "post-1", true),
    ).resolves.toBe(12);

    expect(db.rpc).toHaveBeenCalledWith("like_community_post", {
      target_post_id: "post-1",
    });
  });
});
