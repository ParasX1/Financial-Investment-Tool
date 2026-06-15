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
    const query = Array.isArray(req.query.q)
      ? req.query.q[0]
      : req.query.q || "";
    const context = Array.isArray(req.query.context)
      ? req.query.context[0]
      : req.query.context || "";
    const pageSize = normaliseNewsApiPageSize(
      Array.isArray(req.query.pageSize)
        ? req.query.pageSize[0]
        : req.query.pageSize,
    );

    if (!query.trim()) {
      return res.status(400).json({ error: "q is required" });
    }

    const candidates = [
      ...buildNewsSearchQueries({
        context: String(context),
        query: String(query),
      }).map((q) => ({
        endpoint: "everything" as const,
        params: {
          language: "en",
          q,
          sortBy: "publishedAt",
        },
      })),
      ...businessHeadlineFallback(),
    ];
    const articles = await fetchNewsApiArticles({
      apiKey,
      candidates,
      pageSize,
    });

    res.status(200).json({ articles });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: e.message || "Internal error" });
  }
}
