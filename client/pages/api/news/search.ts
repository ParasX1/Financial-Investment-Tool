import type { NextApiRequest, NextApiResponse } from "next";
import { fetchMarketNewsWithProviders } from "@/lib/news/newsService";
import { normaliseNewsPageSize } from "@/lib/news/providerUtils";
import type { Article } from "@/services/news";

function firstQueryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ articles?: Article[]; error?: string }>,
) {
  try {
    const query = firstQueryValue(req.query.q) || "";
    const context = firstQueryValue(req.query.context) || query;

    if (!query.trim()) {
      return res.status(400).json({ error: "q is required" });
    }

    const result = await fetchMarketNewsWithProviders({
      context,
      kind: "search",
      pageSize: normaliseNewsPageSize(firstQueryValue(req.query.pageSize)),
      query,
    });

    return res.status(200).json({ articles: result.articles });
  } catch (cause) {
    console.error("Market news search error", cause);
    return res.status(502).json({
      error:
        cause instanceof Error
          ? cause.message
          : "Market news provider unavailable",
    });
  }
}
