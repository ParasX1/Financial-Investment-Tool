import type { NextApiRequest, NextApiResponse } from "next";
import {
  buildNewsSearchQueries,
  businessHeadlineFallback,
  fetchNewsApiArticles,
  normaliseNewsApiPageSize,
} from "@/lib/newsApi";
import type { Article } from "@/services/news";

const NAME_BY_SYMBOL: Record<string, string> = {
  AAPL: "Apple Inc.",
  MSFT: "Microsoft",
  AMZN: "Amazon",
  GOOGL: "Alphabet",
  GOOG: "Alphabet",
  NVDA: "NVIDIA",
  META: "Meta Platforms",
  TSLA: "Tesla",
  "^AORD": "Australia All Ordinaries",
  "^AXJO": "ASX 200",
  "AUDUSD=X": "Australian dollar",
  "BTC-AUD": "Bitcoin Australia",
  "CL=F": "oil futures",
  "GC=F": "gold futures",
  "^GSPC": "S&P 500",
  "^IXIC": "Nasdaq",
  "^DJI": "Dow Jones",
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ articles?: Article[]; error?: string }>,
) {
  try {
    const apiKey = process.env.NEXT_PUBLIC_NEWSAPI_KEY;
    const ticker = Array.isArray(req.query.ticker)
      ? req.query.ticker[0]
      : req.query.ticker || "";
    const pageSize = normaliseNewsApiPageSize(
      Array.isArray(req.query.pageSize)
        ? req.query.pageSize[0]
        : req.query.pageSize,
    );

    if (!ticker) return res.status(400).json({ error: "ticker is required" });

    const sym = String(ticker).toUpperCase();
    const name = NAME_BY_SYMBOL[sym];
    const queries = buildNewsSearchQueries({
      context: name,
      fallback: "stock market finance earnings",
      query: name ? `${sym} OR "${name}"` : sym,
    });
    const articles = await fetchNewsApiArticles({
      apiKey,
      candidates: [
        ...queries.map((q) => ({
          endpoint: "everything" as const,
          params: {
            language: "en",
            q,
            sortBy: "publishedAt",
          },
        })),
        ...businessHeadlineFallback(),
      ],
      pageSize,
    });

    res.status(200).json({ articles });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: e.message || "Internal error" });
  }
}
