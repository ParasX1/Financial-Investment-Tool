import {
  insertCommunityCommentRow,
  insertCommunityPostReportRow,
  insertCommunityPostRow,
  loadCommentImagePathRowsForPost,
  loadCommunityCommentRows,
  loadCommunityPostRows,
  selectCommentDeleteContext,
  setCommunityPostLikeValue,
  setCommunityPostSavedValue,
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

function createClient(
  steps: QueryStep[],
  rpc?: (name: string, values: unknown) => Promise<QueryResult>,
) {
  const calls: QueryCall[] = [];
  const db: Record<string, unknown> = {
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

  if (rpc) db.rpc = jest.fn(rpc);
  return { calls, db: db as any };
}

const discussionDraft = {
  title: "A discussion",
  body: "A useful body",
  tags: ["Research"],
  postType: "discussion" as const,
  timeFrame: null,
  tickers: [] as string[],
  symbol: null,
  sourceUrl: null,
  imageUrl: null,
  imagePath: null,
};

describe("Community repository orchestration", () => {
  it("returns non-schema post errors without entering compatibility mode", async () => {
    const error = { code: "57014", message: "query timed out" };
    const { db } = createClient([
      { table: "posts", result: { data: null, error } },
    ]);

    await expect(loadCommunityPostRows(db)).resolves.toEqual({
      data: null,
      error,
    });
    expect(db.from).toHaveBeenCalledTimes(1);
  });

  it("falls back to legacy comment reads only for a missing image path", async () => {
    const comment = {
      id: "comment-1",
      post_id: "post-1",
      body: "Legacy comment",
    };
    const { calls, db } = createClient([
      {
        table: "comments",
        result: { data: null, error: missingColumn("image_path") },
      },
      { table: "comments", result: { data: [comment], error: null } },
    ]);

    await expect(loadCommunityCommentRows(db, ["post-1"])).resolves.toEqual({
      data: [comment],
      error: null,
    });
    const selects = calls
      .filter((call) => call.method === "select")
      .map((call) => String(call.value));
    expect(selects[0]).toContain("image_path");
    expect(selects[1]).not.toContain("image_path");
  });

  it("adds a null image path to legacy comment delete context immutably", async () => {
    const legacyContext = { author_id: "user-1", post_id: "post-1" };
    const { db } = createClient([
      {
        table: "comments",
        result: { data: null, error: missingColumn("image_path") },
      },
      { table: "comments", result: { data: legacyContext, error: null } },
    ]);

    await expect(selectCommentDeleteContext(db, "comment-1")).resolves.toEqual({
      data: { ...legacyContext, image_path: null },
      error: null,
    });
    expect(legacyContext).not.toHaveProperty("image_path");
  });

  it("handles current, missing, and failed comment image path reads", async () => {
    const current = createClient([
      {
        table: "comments",
        result: {
          data: [{ image_path: "comments/post-1/file.png" }],
          error: null,
        },
      },
    ]);
    await expect(
      loadCommentImagePathRowsForPost(current.db, "post-1"),
    ).resolves.toEqual([{ image_path: "comments/post-1/file.png" }]);

    const legacy = createClient([
      {
        table: "comments",
        result: { data: null, error: missingColumn("image_path") },
      },
    ]);
    await expect(
      loadCommentImagePathRowsForPost(legacy.db, "post-1"),
    ).resolves.toEqual([]);

    const error = { code: "57014", message: "query timed out" };
    const failed = createClient([
      { table: "comments", result: { data: null, error } },
    ]);
    await expect(
      loadCommentImagePathRowsForPost(failed.db, "post-1"),
    ).rejects.toBe(error);
  });

  it("maps an object RPC result and derives tickers from the legacy symbol", async () => {
    const rpc = jest.fn(async () => ({
      data: { id: "post-1", title: "A discussion" },
      error: null,
    }));
    const db = { rpc } as any;

    await expect(
      insertCommunityPostRow(
        db,
        { ...discussionDraft, tickers: undefined, symbol: "AAPL" } as any,
        "user-1",
      ),
    ).resolves.toMatchObject({
      id: "post-1",
      post_tickers: [{ symbol: "AAPL", position: 0 }],
    });
  });

  it("rejects invalid tickers before calling the current repository", async () => {
    const rpc = jest.fn();

    await expect(
      insertCommunityPostRow(
        { rpc } as any,
        { ...discussionDraft, tickers: ["???"] },
        "user-1",
      ),
    ).rejects.toThrow();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("surfaces empty and non-schema atomic create failures", async () => {
    await expect(
      insertCommunityPostRow(
        {
          rpc: jest.fn(async () => ({ data: null, error: null })),
        } as any,
        discussionDraft,
        "user-1",
      ),
    ).rejects.toThrow("Could not create the Community post transaction.");

    const error = { code: "42501", message: "permission denied" };
    await expect(
      insertCommunityPostRow(
        {
          rpc: jest.fn(async () => ({ data: null, error })),
        } as any,
        discussionDraft,
        "user-1",
      ),
    ).rejects.toBe(error);
  });

  it("returns a current-schema comment without consulting compatibility", async () => {
    const comment = { id: "comment-1", post_id: "post-1", body: "Current" };
    const { db } = createClient([
      { table: "comments", result: { data: comment, error: null } },
    ]);

    await expect(
      insertCommunityCommentRow({
        db,
        postId: "post-1",
        text: "Current",
        uid: "user-1",
      }),
    ).resolves.toEqual(comment);
    expect(db.from).toHaveBeenCalledTimes(1);
  });

  it("does not downgrade comment permission errors", async () => {
    const error = { code: "42501", message: "permission denied" };
    const { db } = createClient([
      { table: "comments", result: { data: null, error } },
    ]);

    await expect(
      insertCommunityCommentRow({
        db,
        postId: "post-1",
        text: "No access",
        uid: "user-1",
      }),
    ).rejects.toBe(error);
    expect(db.from).toHaveBeenCalledTimes(1);
  });

  it("keeps uploaded comments on the current schema", async () => {
    const { db } = createClient([
      {
        table: "comments",
        result: { data: null, error: missingColumn("image_path") },
      },
    ]);

    await expect(
      insertCommunityCommentRow({
        db,
        postId: "post-1",
        text: "Image",
        imagePath: "comments/post-1/file.png",
        uid: "user-1",
      }),
    ).rejects.toThrow("Could not create comment");
    expect(db.from).toHaveBeenCalledTimes(1);
  });

  it("tries a text-only legacy comment when the current insert returns no row", async () => {
    const comment = { id: "comment-1", post_id: "post-1", body: "Legacy" };
    const { db } = createClient([
      { table: "comments", result: { data: null, error: null } },
      { table: "comments", result: { data: comment, error: null } },
    ]);

    await expect(
      insertCommunityCommentRow({
        db,
        postId: "post-1",
        text: "Legacy",
        uid: "user-1",
      }),
    ).resolves.toEqual(comment);
  });

  it("preserves errors returned by the legacy comment attempt", async () => {
    const error = { code: "42501", message: "permission denied" };
    const { db } = createClient([
      {
        table: "comments",
        result: { data: null, error: missingColumn("image_path") },
      },
      { table: "comments", result: { data: null, error } },
    ]);

    await expect(
      insertCommunityCommentRow({
        db,
        postId: "post-1",
        text: "Legacy",
        uid: "user-1",
      }),
    ).rejects.toBe(error);
  });

  it("normalizes unlike values and surfaces like RPC errors", async () => {
    const unlike = {
      rpc: jest.fn(async () => ({ data: 4, error: null })),
    };
    await expect(
      setCommunityPostLikeValue(unlike as any, "post-1", false),
    ).resolves.toBe(4);
    expect(unlike.rpc).toHaveBeenCalledWith("unlike_community_post", {
      target_post_id: "post-1",
    });

    const error = { code: "42501", message: "permission denied" };
    await expect(
      setCommunityPostLikeValue(
        {
          rpc: jest.fn(async () => ({ data: null, error })),
        } as any,
        "post-1",
        true,
      ),
    ).rejects.toBe(error);
  });

  it("surfaces save and report write errors", async () => {
    const saveError = { code: "42501", message: "save denied" };
    const save = createClient([
      { table: "post_saves", result: { data: null, error: saveError } },
    ]);
    await expect(
      setCommunityPostSavedValue(save.db, "post-1", "user-1", true),
    ).rejects.toBe(saveError);

    const reportError = { code: "42501", message: "report denied" };
    const report = createClient([
      { table: "post_reports", result: { data: null, error: reportError } },
    ]);
    await expect(
      insertCommunityPostReportRow(report.db, {
        postId: "post-1",
        reason: "spam_or_scam",
        details: null,
      }),
    ).rejects.toBe(reportError);
  });
});
