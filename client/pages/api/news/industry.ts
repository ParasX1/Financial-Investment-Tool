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
    const industry = firstQueryValue(req.query.industry) || "technology";
    const result = await fetchMarketNewsWithProviders({
      context: `${industry} sector stocks companies market news`,
      industry,
      kind: "industry",
      pageSize: normaliseNewsPageSize(firstQueryValue(req.query.pageSize)),
    });

    return res.status(200).json({ articles: result.articles });
  } catch (cause) {
    console.error("Market news industry error", cause);
    return res.status(502).json({
      error:
        cause instanceof Error
          ? cause.message
          : "Market news provider unavailable",
    });
  }
}
