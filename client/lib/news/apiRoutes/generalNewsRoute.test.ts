import type { NextApiRequest, NextApiResponse } from "next";
import handler from "@/pages/api/news/general";
import { fetchMarketNewsWithProviders } from "@/lib/news/newsService";

jest.mock("@/lib/news/newsService", () => ({
  fetchMarketNewsWithProviders: jest.fn(),
}));

const mockFetchMarketNewsWithProviders =
  fetchMarketNewsWithProviders as jest.MockedFunction<
    typeof fetchMarketNewsWithProviders
  >;

function createResponse() {
  const headers = new Map<string, string>();
  const res = {
    json: jest.fn().mockReturnThis(),
    setHeader: jest.fn((name: string, value: string) => {
      headers.set(name.toLowerCase(), value);
      return res;
    }),
    status: jest.fn().mockReturnThis(),
  } as unknown as NextApiResponse;

  return { headers, res };
}

describe("/api/news/general", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("preserves provider metadata for legacy callers", async () => {
    mockFetchMarketNewsWithProviders.mockResolvedValue({
      articles: [],
      meta: {
        attemptedProviders: [],
        provider: "demo",
        providerLabel: "Demo",
        query: "finance markets business economy",
        strictCategory: true,
        warnings: [
          "Demo stories are shown because no live market news provider is configured.",
        ],
      },
    });
    const { res } = createResponse();

    await handler({ query: {} } as unknown as NextApiRequest, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      articles: [],
      meta: expect.objectContaining({
        provider: "demo",
        warnings: expect.arrayContaining([
          expect.stringContaining("Demo stories"),
        ]),
      }),
    });
  });
});
