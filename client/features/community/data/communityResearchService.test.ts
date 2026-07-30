import { describe, expect, it, jest } from "@jest/globals";
import {
  loadCommunityData,
  reportCommunityPost,
  setCommunityPostSaved,
} from "./communityService";

type Step = {
  table: string;
  result: { data?: unknown; error?: unknown };
};

function createClient(steps: Step[], userId: string | null = "user-1") {
  const inserts: unknown[] = [];
  const db = {
    auth: {
      getSession: jest.fn(async () => ({
        data: { session: userId ? { user: { id: userId } } : null },
      })),
    },
    from: jest.fn((table: string) => {
      const step = steps.shift();
      if (!step) throw new Error(`Unexpected query for ${table}`);
      expect(table).toBe(step.table);
      const builder: any = {
        delete: jest.fn(() => builder),
        eq: jest.fn(() => builder),
        in: jest.fn(() => builder),
        insert: jest.fn((value: unknown) => {
          inserts.push(value);
          return builder;
        }),
        order: jest.fn(() => builder),
        select: jest.fn(() => builder),
        then: (resolve: (value: unknown) => unknown) =>
          Promise.resolve(step.result).then(resolve),
      };
      return builder;
    }),
  };
  return { db: db as any, inserts };
}

describe("Community research service", () => {
  it("loads saved discussions independently from likes", async () => {
    const { db } = createClient([
      {
        table: "posts",
        result: {
          data: [
            {
              id: "post-1",
              title: "CBA research",
              body: "Compare evidence.",
              tags: [],
              post_type: "analysis",
              time_frame: "medium",
              symbol: "CBA.AX",
              source_url: null,
              image_url: null,
              image_path: null,
              votes: 1,
              created_at: "2026-07-18T00:00:00.000Z",
              author_id: "user-2",
            },
          ],
          error: null,
        },
      },
      { table: "comments", result: { data: [], error: null } },
      { table: "post_likes", result: { data: [], error: null } },
      {
        table: "post_saves",
        result: { data: [{ post_id: "post-1" }], error: null },
      },
    ]);

    const result = await loadCommunityData(db, "user-1");

    expect(result.likedPostIds).toEqual([]);
    expect(result.savedPostIds).toEqual(["post-1"]);
  });

  it("rechecks the active session before changing saved state", async () => {
    const { db } = createClient([], "user-2");

    await expect(
      setCommunityPostSaved(db, "post-1", true, "user-1"),
    ).rejects.toThrow("Your session changed. Please try again.");
    expect(db.from).not.toHaveBeenCalled();
  });

  it("requires a valid reason and submits a normalized private report", async () => {
    const invalid = createClient([]);
    await expect(
      reportCommunityPost(invalid.db, {
        postId: "post-1",
        reason: "made_up_reason" as any,
        details: "Example",
        expectedUserId: "user-1",
      }),
    ).rejects.toThrow("Choose a valid report reason.");
    expect(invalid.db.from).not.toHaveBeenCalled();

    const valid = createClient([
      { table: "post_reports", result: { data: null, error: null } },
    ]);
    await reportCommunityPost(valid.db, {
      postId: "post-1",
      reason: "misleading_financial_claim",
      details: "  Unsupported return claim.  ",
      expectedUserId: "user-1",
    });
    expect(valid.inserts).toEqual([
      {
        post_id: "post-1",
        reason: "misleading_financial_claim",
        details: "Unsupported return claim.",
      },
    ]);
  });
});
