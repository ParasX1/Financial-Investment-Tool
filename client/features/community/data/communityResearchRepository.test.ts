import { describe, expect, it, jest } from "@jest/globals";
import {
  insertCommunityPostReportRow,
  insertCommunityPostRow,
  selectSavedPostRows,
  setCommunityPostSavedValue,
} from "./communityRepository";

type Step = {
  table: string;
  result: { data?: unknown; error?: unknown };
};

function createClient(steps: Step[]) {
  const calls: Array<{ method: string; value?: unknown }> = [];
  const db = {
    from: jest.fn((table: string) => {
      const step = steps.shift();
      if (!step) throw new Error(`Unexpected query for ${table}`);
      expect(table).toBe(step.table);

      const builder: any = {
        delete: jest.fn(() => {
          calls.push({ method: "delete" });
          return builder;
        }),
        eq: jest.fn((column: string, value: unknown) => {
          calls.push({ method: `eq:${column}`, value });
          return builder;
        }),
        in: jest.fn((column: string, value: unknown) => {
          calls.push({ method: `in:${column}`, value });
          return builder;
        }),
        insert: jest.fn((value: unknown) => {
          calls.push({ method: "insert", value });
          return builder;
        }),
        select: jest.fn((value: string) => {
          calls.push({ method: "select", value });
          return builder;
        }),
        single: jest.fn(async () => step.result),
        then: (resolve: (value: unknown) => unknown) =>
          Promise.resolve(step.result).then(resolve),
      };
      return builder;
    }),
  };

  return { calls, db: db as any };
}

const structuredDraft = {
  title: "Why I am researching CBA",
  body: "I want to compare earnings and valuation.",
  tags: ["Banking"],
  postType: "analysis" as const,
  timeFrame: "medium" as const,
  tickers: ["CBA.AX", "NVDA"],
  symbol: "CBA.AX",
  sourceUrl: "https://www.asx.com.au/markets/company/cba",
  imageUrl: null,
  imagePath: null,
};

describe("Community research repository", () => {
  it("persists every ordered ticker while keeping the first on the legacy post row", async () => {
    const postRow = {
      id: "post-1",
      title: structuredDraft.title,
      votes: 0,
      created_at: "2026-07-18T00:00:00.000Z",
      author_id: "user-1",
      symbol: "CBA.AX",
    };
    const db = {
      from: jest.fn(),
      rpc: jest.fn(async () => ({ data: [postRow], error: null })),
    } as any;

    await expect(
      insertCommunityPostRow(db, structuredDraft, "user-1"),
    ).resolves.toMatchObject({
      id: "post-1",
      post_tickers: [
        { symbol: "CBA.AX", position: 0 },
        { symbol: "NVDA", position: 1 },
      ],
    });

    expect(db.rpc).toHaveBeenCalledWith(
      "create_community_post_with_tickers",
      expect.objectContaining({ p_tickers: ["CBA.AX", "NVDA"] }),
    );
    expect(db.from).not.toHaveBeenCalled();
  });

  it("refuses multiple tickers before writing when the atomic RPC is unavailable", async () => {
    const db = {
      from: jest.fn(),
      rpc: jest.fn(async () => ({
        data: null,
        error: {
          code: "PGRST202",
          message: "Could not find create_community_post_with_tickers",
        },
      })),
    } as any;

    await expect(
      insertCommunityPostRow(db, structuredDraft, "user-1"),
    ).rejects.toThrow(/database update/i);
    expect(db.from).not.toHaveBeenCalled();
  });

  it("does not silently discard explicit context on an older posts schema", async () => {
    const missingContext = {
      code: "42703",
      message: 'column "post_type" does not exist',
    };
    const legacyRow = {
      id: "post-1",
      title: structuredDraft.title,
      votes: 0,
      created_at: "2026-07-18T00:00:00.000Z",
      author_id: "user-1",
    };
    const { db } = createClient([
      { table: "posts", result: { data: null, error: missingContext } },
      { table: "posts", result: { data: null, error: missingContext } },
      { table: "posts", result: { data: legacyRow, error: null } },
    ]);

    await expect(
      insertCommunityPostRow(db, structuredDraft, "user-1"),
    ).rejects.toThrow(/database update/i);
  });

  it("loads only the active user's saved rows for visible posts", async () => {
    const { calls, db } = createClient([
      {
        table: "post_saves",
        result: { data: [{ post_id: "post-1" }], error: null },
      },
    ]);

    await expect(
      selectSavedPostRows(db, ["post-1", "post-2"], "user-1"),
    ).resolves.toEqual({ data: [{ post_id: "post-1" }], error: null });
    expect(calls).toEqual([
      { method: "select", value: "post_id" },
      { method: "eq:user_id", value: "user-1" },
      { method: "in:post_id", value: ["post-1", "post-2"] },
    ]);
  });

  it("saves with database-owned identity and deletes defensively by owner", async () => {
    const save = createClient([
      { table: "post_saves", result: { data: null, error: null } },
    ]);
    await setCommunityPostSavedValue(save.db, "post-1", "user-1", true);
    expect(save.calls).toEqual([
      { method: "insert", value: { post_id: "post-1" } },
    ]);

    const remove = createClient([
      { table: "post_saves", result: { data: null, error: null } },
    ]);
    await setCommunityPostSavedValue(remove.db, "post-1", "user-1", false);
    expect(remove.calls).toEqual([
      { method: "delete" },
      { method: "eq:post_id", value: "post-1" },
      { method: "eq:user_id", value: "user-1" },
    ]);
  });

  it("reports only client-owned fields and leaves identity and status to the database", async () => {
    const { calls, db } = createClient([
      { table: "post_reports", result: { data: null, error: null } },
    ]);

    await insertCommunityPostReportRow(db, {
      postId: "post-1",
      reason: "misleading_financial_claim",
      details: "The return claim has no source.",
    });

    expect(calls).toEqual([
      {
        method: "insert",
        value: {
          post_id: "post-1",
          reason: "misleading_financial_claim",
          details: "The return claim has no source.",
        },
      },
    ]);
  });
});
