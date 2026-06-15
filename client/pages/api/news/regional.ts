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
    const country = firstQueryValue(req.query.country) || "au";
    const result = await fetchMarketNewsWithProviders({
      context: `${country} market business economy`,
      country,
      kind: "regional",
      pageSize: normaliseNewsPageSize(firstQueryValue(req.query.pageSize)),
    });

    return res.status(200).json({ articles: result.articles });
  } catch (cause) {
    console.error("Market news regional error", cause);
    return res.status(502).json({
      error:
        cause instanceof Error
          ? cause.message
          : "Market news provider unavailable",
    });
  }
}
