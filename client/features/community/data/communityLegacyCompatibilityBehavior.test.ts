import { insertLegacyCompatibleCommunityPostRow } from "./communityLegacyCompatibility";

describe("Community legacy write compatibility", () => {
  it("refuses to discard explicit source context on a pre-research schema", async () => {
    const error = {
      code: "42703",
      message: 'column "source_url" does not exist',
    };
    const builder: any = {
      insert: jest.fn(() => builder),
      select: jest.fn(() => builder),
      single: jest.fn(async () => ({ data: null, error })),
    };
    const db = { from: jest.fn(() => builder) } as any;

    await expect(
      insertLegacyCompatibleCommunityPostRow(
        db,
        {
          title: "Source-backed research",
          body: "A research note",
          tags: ["Research"],
          postType: "analysis",
          timeFrame: "medium",
          tickers: ["AAPL"],
          symbol: "AAPL",
          sourceUrl: "https://example.com/research",
          imageUrl: null,
          imagePath: null,
        },
        "user-1",
      ),
    ).rejects.toThrow(/database update/i);
    expect(db.from).toHaveBeenCalledTimes(1);
  });
});
