import type { NextApiRequest, NextApiResponse } from "next";
import {
  buildNewsSearchQueries,
  businessHeadlineFallback,
  fetchNewsApiArticles,
  normaliseNewsApiPageSize,
} from "@/lib/newsApi";
import type { Article } from "@/services/news";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ articles?: Article[]; error?: string }>,
) {
  try {
    const apiKey = process.env.NEXT_PUBLIC_NEWSAPI_KEY;
    const industry =
      (Array.isArray(req.query.industry)
        ? req.query.industry[0]
        : req.query.industry) || "technology";
    const pageSize = normaliseNewsApiPageSize(
      Array.isArray(req.query.pageSize)
        ? req.query.pageSize[0]
        : req.query.pageSize,
    );
    const industryQueries = buildNewsSearchQueries({
      fallback: "technology stocks AI software semiconductors",
      query: String(industry),
    });
    const articles = await fetchNewsApiArticles({
      apiKey,
      candidates: [
        {
          endpoint: "top-headlines",
          params: {
            category: "business",
            q: String(industry),
          },
        },
        ...industryQueries.map((q) => ({
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
    res.status(500).json({ error: e.message });
  }
}
