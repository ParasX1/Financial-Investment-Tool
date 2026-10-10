// Bypassing the composer must still validate before any database write/fallback.
import { createCommunityComment } from "./communityService";

function createDatabase() {
  const insert = jest.fn();
  const query: any = {
    insert: jest.fn((value) => {
      insert(value);
      return query;
    }),
    select: jest.fn(() => query),
    single: jest.fn(async () => ({
      data: {
        id: "comment-1",
        body: insert.mock.calls.at(-1)?.[0].body,
        created_at: "2026-10-09T00:00:00Z",
      },
      error: null,
    })),
  };
  const db = {
    auth: {
      getSession: jest.fn(async () => ({
        data: { session: { user: { id: "user-1" } } },
      })),
    },
    from: jest.fn(() => query),
  } as any;
  return { db, insert, query };
}

describe("Community comment write boundaries", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://watchlist-e2e.supabase.co";
  });
  it.each(["x".repeat(2001), "😀".repeat(2001), " ".repeat(2001)])(
    "rejects an overlong service call before writing",
    async (text) => {
      const { db } = createDatabase();
      await expect(
        createCommunityComment({
          authorId: "user-1",
          db,
          postId: "post-1",
          text,
        }),
      ).rejects.toThrow("Keep the comment to 2,000 characters or fewer.");
      expect(db.from).not.toHaveBeenCalled();
    },
  );

  it("preserves accepted text through the supported legacy adapter", async () => {
    const text = "界".repeat(2000);
    const { db, insert, query } = createDatabase();
    query.single
      .mockResolvedValueOnce({
        data: null,
        error: { code: "42703", message: 'column "image_path" does not exist' },
      })
      .mockResolvedValueOnce({
        data: {
          id: "legacy-comment",
          body: text,
          created_at: "2026-10-09T00:00:00Z",
        },
        error: null,
      });
    await createCommunityComment({
      authorId: "user-1",
      db,
      postId: "post-1",
      text,
    });
    expect(insert).toHaveBeenCalledTimes(2);
    expect(insert).toHaveBeenLastCalledWith(
      expect.objectContaining({ body: text }),
    );
  });

  it.each([
    "x".repeat(2000),
    "界".repeat(2000),
    "😀".repeat(2000),
    "e\u0301".repeat(1000),
    "",
    "  ",
  ])("preserves accepted service text exactly", async (text) => {
    const { db, insert } = createDatabase();
    await createCommunityComment({
      authorId: "user-1",
      db,
      postId: "post-1",
      text,
    });
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ body: text }),
    );
  });

  it("preserves the service's image-only comment contract", async () => {
    const { db, insert } = createDatabase();
    await createCommunityComment({
      authorId: "user-1",
      db,
      postId: "post-1",
      text: "",
      imagePath: "comments/post-1/chart.png",
      imageUrl:
        "https://watchlist-e2e.supabase.co/storage/v1/object/public/comment-images/comments/post-1/chart.png",
    });
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        body: "",
        image_path: "comments/post-1/chart.png",
      }),
    );
  });
});
